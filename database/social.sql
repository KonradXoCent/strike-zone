-- Persistent conversations. Clients can read only their memberships and messages;
-- all writes pass through authenticated, bounded RPCs. No account email is exposed.
create schema if not exists sz_social_private;
revoke all on schema sz_social_private from public,anon,authenticated;
create table if not exists public.sz_chat_threads (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('direct','group')),
 title text not null default '' check(length(title)<=48), owner_id uuid references auth.users(id) on delete set null,
 direct_key text unique, client_nonce uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 last_seq bigint not null default 0, unique(owner_id,client_nonce)
);
create table if not exists public.sz_chat_members (
 thread_id uuid not null references public.sz_chat_threads(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(), last_read_seq bigint not null default 0,
 primary key(thread_id,user_id)
);
create index if not exists sz_chat_members_user on public.sz_chat_members(user_id,thread_id);
create table if not exists public.sz_chat_messages (
 id bigint generated always as identity primary key,
 thread_id uuid not null references public.sz_chat_threads(id) on delete cascade,
 sender_id uuid references auth.users(id) on delete set null,
 sender_name text not null, body text not null check(length(btrim(body)) between 1 and 2000),
 client_nonce uuid not null, created_at timestamptz not null default now(), unique(sender_id,client_nonce)
);
create index if not exists sz_chat_messages_thread on public.sz_chat_messages(thread_id,id desc);
create index if not exists sz_chat_messages_sender on public.sz_chat_messages(sender_id,created_at desc);
alter table public.sz_chat_threads enable row level security;
alter table public.sz_chat_members enable row level security;
alter table public.sz_chat_messages enable row level security;
revoke all on public.sz_chat_threads,public.sz_chat_members,public.sz_chat_messages from public,anon,authenticated;
grant select on public.sz_chat_threads,public.sz_chat_members,public.sz_chat_messages to authenticated;
create or replace function sz_social_private.member(t uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sz_chat_members where thread_id=t and user_id=(select auth.uid()))
$$;
revoke all on function sz_social_private.member(uuid) from public,anon;
grant usage on schema sz_social_private to authenticated;
grant execute on function sz_social_private.member(uuid) to authenticated;
drop policy if exists chat_threads_read on public.sz_chat_threads;
create policy chat_threads_read on public.sz_chat_threads for select to authenticated using(sz_social_private.member(id));
drop policy if exists chat_members_read on public.sz_chat_members;
create policy chat_members_read on public.sz_chat_members for select to authenticated using(sz_social_private.member(thread_id));
drop policy if exists chat_messages_read on public.sz_chat_messages;
create policy chat_messages_read on public.sz_chat_messages for select to authenticated using(sz_social_private.member(thread_id));

-- A single RPC boundary keeps authorization consistent for web and desktop.
create or replace function sz_social_private.dispatch(action text, args jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); tid uuid; target uuid; ids uuid[]; nonce uuid; k text; txt text; seq bigint; cur bigint;
 result jsonb; item public.sz_chat_threads; msg public.sz_chat_messages; n integer; owner uuid;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'CHAT_AUTH'; end if;
 if action='list' then
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.updated_at desc,x.id),'[]'::jsonb) into result from (
   select t.id,t.kind,t.title,t.owner_id,t.updated_at,t.last_seq::text,
    (select count(*)::int from public.sz_chat_messages m where m.thread_id=t.id and m.id>me.last_read_seq and m.sender_id is distinct from uid) unread,
    (select jsonb_build_object('body',m.body,'sender_id',m.sender_id,'sender_name',m.sender_name,'id',m.id::text,'created_at',m.created_at) from public.sz_chat_messages m where m.thread_id=t.id order by m.id desc limit 1) latest,
    (select coalesce(jsonb_agg(jsonb_build_object('id',p.user_id,'name',coalesce(l.name,'Player'),'avatar',coalesce(l.av,'😎')) order by p.joined_at,p.user_id),'[]'::jsonb) from public.sz_chat_members p left join public.leaderboard l on l.user_id=p.user_id where p.thread_id=t.id) members
   from public.sz_chat_threads t join public.sz_chat_members me on me.thread_id=t.id and me.user_id=uid
  ) x;
  return result;
 end if;
 if action in ('direct','group') then
  perform pg_advisory_xact_lock(hashtextextended(uid::text,1501));
  if action='direct' then
   target:=(args->>'user')::uuid;
   if target=uid or target is null then raise exception 'CHAT_FRIEND'; end if;
   k:=least(uid::text,target::text)||':'||greatest(uid::text,target::text);
   select id into tid from public.sz_chat_threads where direct_key=k;
   if tid is not null then return jsonb_build_object('id',tid); end if;
   if not exists(select 1 from public.friends where user_id=uid and friend_id=target) then raise exception 'CHAT_FRIEND'; end if;
   insert into public.sz_chat_threads(kind,owner_id,direct_key) values('direct',uid,k) on conflict(direct_key) do nothing returning id into tid;
   if tid is null then select id into tid from public.sz_chat_threads where direct_key=k; end if;
   insert into public.sz_chat_members(thread_id,user_id) values(tid,uid),(tid,target) on conflict do nothing;
  else
   nonce:=(args->>'nonce')::uuid; txt:=btrim(args->>'title');
   if nonce is null or txt is null or length(txt) not between 1 and 48 then raise exception 'CHAT_TITLE'; end if;
   select id into tid from public.sz_chat_threads where owner_id=uid and client_nonce=nonce;
   if tid is not null then return jsonb_build_object('id',tid); end if;
   select array_agg(distinct v::uuid) into ids from jsonb_array_elements_text(coalesce(args->'users','[]'::jsonb)) a(v) where v::uuid<>uid;
   if coalesce(array_length(ids,1),0) not between 1 and 15 or exists(select 1 from unnest(ids) v where not exists(select 1 from public.friends f where f.user_id=uid and f.friend_id=v)) then raise exception 'CHAT_FRIEND'; end if;
   if (select count(*) from public.sz_chat_threads where owner_id=uid and kind='group' and created_at>now()-interval '24 hours')>=10 then raise exception 'CHAT_LIMIT'; end if;
   insert into public.sz_chat_threads(kind,title,owner_id,client_nonce) values('group',txt,uid,nonce) returning id into tid;
   insert into public.sz_chat_members(thread_id,user_id) select tid,unnest(array_append(ids,uid));
  end if;
  return jsonb_build_object('id',tid);
 end if;
 tid:=(args->>'thread')::uuid;
 if not sz_social_private.member(tid) then raise exception 'CHAT_ACCESS'; end if;
 select * into item from public.sz_chat_threads where id=tid;
 if action='history' then
  seq:=coalesce((args->>'before')::bigint,9223372036854775807);
  select coalesce(jsonb_agg(jsonb_build_object('id',x.id::text,'sender_id',x.sender_id,'sender_name',x.sender_name,'body',x.body,'created_at',x.created_at,'nonce',x.client_nonce) order by x.id),'[]'::jsonb) into result
   from (select * from public.sz_chat_messages where thread_id=tid and id<seq order by id desc limit 50) x;
  return jsonb_build_object('messages',result,'older',jsonb_array_length(result)=50);
 elsif action='send' then
  nonce:=(args->>'nonce')::uuid; txt:=btrim(args->>'body');
  if nonce is null or txt is null or length(txt) not between 1 and 2000 then raise exception 'CHAT_BODY'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,1502));
  -- Serialize inserts before allocating sequence IDs, preserving commit/read order.
  perform 1 from public.sz_chat_threads where id=tid for update;
  if not sz_social_private.member(tid) then raise exception 'CHAT_ACCESS'; end if;
  select * into msg from public.sz_chat_messages where sender_id=uid and client_nonce=nonce;
  if msg.id is not null then
   if msg.thread_id<>tid or msg.body<>txt then raise exception 'CHAT_NONCE'; end if;
   return jsonb_build_object('id',msg.id::text);
  end if;
  if (select count(*) from public.sz_chat_messages where sender_id=uid and created_at>now()-interval '1 minute')>=30 then raise exception 'CHAT_LIMIT'; end if;
  insert into public.sz_chat_messages(thread_id,sender_id,sender_name,body,client_nonce)
   values(tid,uid,coalesce((select name from public.leaderboard where user_id=uid),'Player'),txt,nonce) returning id into seq;
  update public.sz_chat_threads set updated_at=clock_timestamp(),last_seq=greatest(last_seq,seq) where id=tid;
  return jsonb_build_object('id',seq::text);
 elsif action='read' then
  seq:=least(coalesce((args->>'through')::bigint,0),item.last_seq);
  update public.sz_chat_members set last_read_seq=greatest(last_read_seq,seq) where thread_id=tid and user_id=uid;
  return '{}'::jsonb;
 elsif action='rename' then
  select * into item from public.sz_chat_threads where id=tid for update;
  if not sz_social_private.member(tid) then raise exception 'CHAT_ACCESS'; end if;
  txt:=btrim(args->>'title');
  if item.kind<>'group' or item.owner_id<>uid then raise exception 'CHAT_OWNER'; end if;
  if txt is null or length(txt) not between 1 and 48 then raise exception 'CHAT_TITLE'; end if;
  update public.sz_chat_threads set title=txt where id=tid;
 elsif action in ('add','remove','leave') then
  select * into item from public.sz_chat_threads where id=tid for update;
  if not sz_social_private.member(tid) then raise exception 'CHAT_ACCESS'; end if;
  if item.kind<>'group' then raise exception 'CHAT_GROUP'; end if;
  if action='leave' then target:=uid;
  else
   if item.owner_id<>uid then raise exception 'CHAT_OWNER'; end if;
   target:=(args->>'user')::uuid;
   if target is null or target=uid then raise exception 'CHAT_FRIEND'; end if;
  end if;
  if action='add' then
   if not exists(select 1 from public.friends where user_id=uid and friend_id=target) then raise exception 'CHAT_FRIEND'; end if;
   perform 1 from public.sz_chat_threads where id=tid for update;
   if (select count(*) from public.sz_chat_members where thread_id=tid)>=16 then raise exception 'CHAT_LIMIT'; end if;
   insert into public.sz_chat_members(thread_id,user_id,last_read_seq) values(tid,target,item.last_seq) on conflict do nothing;
  else
   delete from public.sz_chat_members where thread_id=tid and user_id=target;
   if target=item.owner_id then
    select user_id into owner from public.sz_chat_members where thread_id=tid order by joined_at,user_id limit 1;
    update public.sz_chat_threads set owner_id=owner where id=tid;
   end if;
  end if;
 else raise exception 'CHAT_ACTION'; end if;
 return '{}'::jsonb;
end $$;
revoke all on function sz_social_private.dispatch(text,jsonb) from public,anon,authenticated;
create or replace function public.sz_chat(action text,args jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select sz_social_private.dispatch(action,args) $$;
-- Only the public RPC wrapper is exposed by PostgREST. The private dispatcher still
-- authorizes auth.uid() on every call; schema isn't in the API exposed-schemas list.
grant execute on function sz_social_private.dispatch(text,jsonb) to authenticated;
revoke all on function public.sz_chat(text,jsonb) from public,anon;
grant execute on function public.sz_chat(text,jsonb) to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sz_chat_messages') then alter publication supabase_realtime add table public.sz_chat_messages; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sz_chat_members') then alter publication supabase_realtime add table public.sz_chat_members; end if;
 end if;
end $$;
notify pgrst, 'reload schema';
