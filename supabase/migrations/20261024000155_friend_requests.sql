-- Existing friend lists remain readable. New friendships require the recipient's
-- consent; accepting and removing a friendship update both rows atomically.
create schema if not exists sz_friends_private;
revoke all on schema sz_friends_private from public, anon, authenticated;
create table if not exists public.sz_friend_requests (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(),
 check(sender_id<>recipient_id)
);
create unique index if not exists sz_friend_requests_pair on public.sz_friend_requests(least(sender_id,recipient_id),greatest(sender_id,recipient_id));
create index if not exists sz_friend_requests_recipient on public.sz_friend_requests(recipient_id,created_at desc) where status='pending';
create index if not exists sz_friend_requests_sender on public.sz_friend_requests(sender_id,created_at desc) where status='pending';
create index if not exists leaderboard_friend_nickname on public.leaderboard(lower(btrim(name)));
create table if not exists sz_friends_private.events(sender_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create index if not exists friend_events_sender on sz_friends_private.events(sender_id,created_at desc);
alter table public.sz_friend_requests enable row level security;
alter table sz_friends_private.events enable row level security;
revoke all on public.sz_friend_requests from public,anon,authenticated;
grant select on public.sz_friend_requests to authenticated;
drop policy if exists friend_request_read on public.sz_friend_requests;
create policy friend_request_read on public.sz_friend_requests for select to authenticated using ((select auth.uid()) in (sender_id,recipient_id));
-- Retain SELECT and the existing policies for older friend lists. Direct writes
-- must not bypass a recipient's approval through an older client.
revoke insert,update,delete on public.friends from public,anon,authenticated;

create or replace function sz_friends_private.command(action text,args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); target uuid; ids uuid[]; request public.sz_friend_requests; nickname text; own_name text;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'FRIEND_LOGIN' using errcode='42501'; end if;
 if action='list' then
  return jsonb_build_object('incoming',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'user_id',r.sender_id,'name',coalesce(l.name,'Player'),'avimg',l.avimg,'created_at',r.created_at) order by r.created_at desc) from public.sz_friend_requests r left join public.leaderboard l on l.user_id=r.sender_id where r.recipient_id=uid and r.status='pending'),'[]'::jsonb),'outgoing',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'user_id',r.recipient_id,'name',coalesce(l.name,'Player'),'avimg',l.avimg,'created_at',r.created_at) order by r.created_at desc) from public.sz_friend_requests r left join public.leaderboard l on l.user_id=r.recipient_id where r.sender_id=uid and r.status='pending'),'[]'::jsonb));
 end if;
 if action='request' then
  nickname:=btrim(coalesce(args->>'nickname',''));
  if length(nickname) not between 1 and 14 then raise exception 'FRIEND_NOT_FOUND'; end if;
  select array_agg(user_id) into ids from (select user_id from public.leaderboard where lower(btrim(name))=lower(nickname) limit 2) matches;
  if coalesce(array_length(ids,1),0)=0 then raise exception 'FRIEND_NOT_FOUND'; end if;
  if array_length(ids,1)>1 then raise exception 'FRIEND_NAME_AMBIGUOUS'; end if;
  target:=ids[1];
  if target=uid then raise exception 'FRIEND_SELF'; end if;
 else
  if action in ('accept','decline','cancel') then
   select * into request from public.sz_friend_requests where id=(args->>'id')::uuid;
   if not found then raise exception 'FRIEND_NOT_PENDING'; end if;
   if uid not in (request.sender_id,request.recipient_id) then raise exception 'FRIEND_FORBIDDEN' using errcode='42501'; end if;
   target:=case when request.sender_id=uid then request.recipient_id else request.sender_id end;
  elsif action='remove' then target:=(args->>'id')::uuid;
  else raise exception 'FRIEND_FORBIDDEN' using errcode='42501'; end if;
 end if;
 if target is null or target=uid then raise exception 'FRIEND_FORBIDDEN' using errcode='42501'; end if;
 -- Stable lock order also handles opposite simultaneous invitations.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(least(uid,target)::text,641));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(greatest(uid,target)::text,641));
 if action='remove' then
  delete from public.friends where (user_id=uid and friend_id=target) or (user_id=target and friend_id=uid);
  update public.sz_friend_requests set status='cancelled' where least(sender_id,recipient_id)=least(uid,target) and greatest(sender_id,recipient_id)=greatest(uid,target);
  return jsonb_build_object('status','removed');
 end if;
 if action='request' then
  if exists(select 1 from public.friends where user_id=uid and friend_id=target) and exists(select 1 from public.friends where user_id=target and friend_id=uid) then raise exception 'FRIEND_ALREADY'; end if;
  select * into request from public.sz_friend_requests where least(sender_id,recipient_id)=least(uid,target) and greatest(sender_id,recipient_id)=greatest(uid,target) for update;
  if request.status='pending' then
   if request.sender_id=uid then raise exception 'FRIEND_PENDING'; else raise exception 'FRIEND_REVERSE'; end if;
  end if;
  if (request.id is not null and request.created_at>now()-interval '1 minute') or (select count(*) from sz_friends_private.events where sender_id=uid and created_at>now()-interval '1 hour')>=24 or (select count(*) from public.sz_friend_requests where sender_id=uid and status='pending')>=100 then raise exception 'FRIEND_LIMIT'; end if;
  if request.id is null then insert into public.sz_friend_requests(sender_id,recipient_id) values(uid,target);
  else update public.sz_friend_requests set sender_id=uid,recipient_id=target,status='pending',created_at=now() where id=request.id; end if;
  insert into sz_friends_private.events(sender_id) values(uid);
  return jsonb_build_object('status','pending');
 end if;
 select * into request from public.sz_friend_requests where id=request.id for update;
 if request.status<>'pending' then
  if action='accept' and request.status='accepted' and request.recipient_id=uid then return jsonb_build_object('status','accepted'); end if;
  raise exception 'FRIEND_NOT_PENDING';
 end if;
 if action in ('accept','decline') and request.recipient_id<>uid or action='cancel' and request.sender_id<>uid then raise exception 'FRIEND_FORBIDDEN' using errcode='42501'; end if;
 if action='accept' then
  select coalesce(name,'Player') into nickname from public.leaderboard where user_id=target;
  select coalesce(name,'Player') into own_name from public.leaderboard where user_id=uid;
  insert into public.friends(user_id,friend_id,name) values(uid,target,coalesce(nickname,'Player')) on conflict(user_id,friend_id) do update set name=excluded.name;
  insert into public.friends(user_id,friend_id,name) values(target,uid,coalesce(own_name,'Player')) on conflict(user_id,friend_id) do update set name=excluded.name;
 end if;
 update public.sz_friend_requests set status=case action when 'accept' then 'accepted' when 'decline' then 'declined' else 'cancelled' end where id=request.id;
 return jsonb_build_object('status',case action when 'accept' then 'accepted' when 'decline' then 'declined' else 'cancelled' end);
end $$;
revoke all on function sz_friends_private.command(text,jsonb) from public,anon,authenticated;
grant usage on schema sz_friends_private to authenticated;
grant execute on function sz_friends_private.command(text,jsonb) to authenticated;
create or replace function public.sz_friends(action text,args jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select sz_friends_private.command(action,args) $$;
revoke all on function public.sz_friends(text,jsonb) from public,anon;
grant execute on function public.sz_friends(text,jsonb) to authenticated;
notify pgrst,'reload schema';
