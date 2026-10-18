-- Additive upgrade for the existing Workshop. Owner rights come from the
-- server-owned admin table, never nicknames, email or user-editable metadata.
create or replace function sz_workshop_private.project_valid(kind text,p jsonb,paths boolean default false) returns boolean
language plpgsql immutable set search_path='' as $$
declare k text; lim integer; r jsonb; s jsonb; pt jsonb; c jsonb; v integer[]; targets jsonb; a integer; b integer;
  grid integer[]:=array_fill(0,array[6144]); blocked boolean[]:=array_fill(false,array[6144]);
  seen boolean[]:=array_fill(false,array[6144]); queue integer[]:=array_fill(0,array[6144]);
  x integer; y integer; xx integer; yy integer; idx integer; nxt integer; start integer; head integer:=1; tail integer:=0;
begin
  if jsonb_typeof(p) is distinct from 'object' or (p->>'kind') is distinct from ('sz-'||kind) or (p->>'version') is distinct from '1'
    or coalesce(p->>'id','')!~'^[a-zA-Z0-9-]{1,50}$'
    or jsonb_typeof(p->'name') is distinct from 'string' or length(p->>'name') not between 1 and 40
    or p->>'name' ~ '[<>[:cntrl:]]' or octet_length(p::text)>250000 then return false; end if;
  if kind='skin' then
    if coalesce(p->>'weapon','')<>all(array['knife','glock','usp','deagle','elite','fiveseven','tec9','cz75','r8','mac10','mp7','p90','bizon','xm1014','mag7','sawed','m249','negev','galil','famas','sg553','aug','ssg','g3sg1','scar20','p250','ump','mp9','nova','ak','m4','awp'])
      or coalesce(p->>'model','')<>all(array['classic','karambit','m9','machete','butterfly','pickaxe','kukri','stiletto'])
      or coalesce(p->>'pattern','')<>all(array['solid','fade','stripes','camo','digital','web'])
      or jsonb_typeof(p->'colors') is distinct from 'array' or jsonb_array_length(p->'colors')<>3
      or jsonb_typeof(p->'strokes') is distinct from 'array' or jsonb_array_length(p->'strokes')>80 then return false; end if;
    for c in select * from jsonb_array_elements(p->'colors') loop
      if jsonb_typeof(c) is distinct from 'string' or (c#>>'{}')!~'^#[0-9a-fA-F]{6}$' then return false; end if;
    end loop;
    for s in select * from jsonb_array_elements(p->'strokes') loop
      if jsonb_typeof(s) is distinct from 'object' or coalesce(s->>'color','')!~'^#[0-9a-fA-F]{6}$'
        or jsonb_typeof(s->'size') is distinct from 'number' or (s->>'size')::numeric not between .5 and 12
        or jsonb_typeof(s->'points') is distinct from 'array' or jsonb_array_length(s->'points') not between 1 and 120 then return false; end if;
      for pt in select * from jsonb_array_elements(s->'points') loop
        if jsonb_typeof(pt) is distinct from 'array' or jsonb_array_length(pt)<>2 then return false; end if;
        for c in select * from jsonb_array_elements(pt) loop
          if jsonb_typeof(c) is distinct from 'number' or (c::text)::numeric not between -32 and 120 then return false; end if;
        end loop;
      end loop;
    end loop;
    return true;
  elsif kind<>'map' then return false; end if;
  if (p->>'width') is distinct from '1536' or (p->>'height') is distinct from '1024' or coalesce(p->>'theme','')<>all(array['industrial','desert','forest'])
    or coalesce(p->>'mode','tdm')<>all(array['classic','tdm','ctf']) then return false; end if;
  foreach k in array array['walls','covers','windows','spawns','sites'] loop
    lim:=case k when 'walls' then 192 when 'covers' then 48 when 'windows' then 32 else 2 end;
    if jsonb_typeof(p->k) is distinct from 'array' or jsonb_array_length(p->k)>lim then return false; end if;
    if k in ('spawns','sites') and jsonb_array_length(p->k)<>2 then return false; end if;
    for r in select * from jsonb_array_elements(p->k) loop
      if not sz_workshop_private.rect_valid(r) then return false; end if;
      if k in ('spawns','sites') and ((r->>2)::integer<96 or (r->>3)::integer<96) then return false; end if;
    end loop;
  end loop;
  if not paths then return true; end if;
  -- Same 16-unit collision grid and one-cell actor clearance as the game.
  for y in 0..63 loop for x in 0..95 loop
    if x<2 or y<2 or x>=94 or y>=62 then grid[1+y*96+x]:=1; end if;
  end loop; end loop;
  foreach k in array array['walls','covers','windows'] loop
    for r in select * from jsonb_array_elements(p->k) loop
      v:=array[(r->>0)::integer,(r->>1)::integer,(r->>2)::integer,(r->>3)::integer];
      for y in v[2]/16..(v[2]+v[4])/16-1 loop for x in v[1]/16..(v[1]+v[3])/16-1 loop grid[1+y*96+x]:=1; end loop; end loop;
    end loop;
  end loop;
  for y in 0..63 loop for x in 0..95 loop
    for yy in y-1..y+1 loop for xx in x-1..x+1 loop
      if xx<0 or yy<0 or xx>95 or yy>63 or grid[1+yy*96+xx]>0 then blocked[1+y*96+x]:=true; end if;
    end loop; end loop;
  end loop; end loop;
  targets:=(p->'spawns')||(p->'sites');
  for a in 0..3 loop
    r:=targets->a;v:=array[(r->>0)::integer,(r->>1)::integer,(r->>2)::integer,(r->>3)::integer];
    for y in v[2]/16..(v[2]+v[4])/16-1 loop for x in v[1]/16..(v[1]+v[3])/16-1 loop if blocked[1+y*96+x] then return false; end if; end loop; end loop;
    for b in a+1..3 loop
      s:=targets->b;
      if v[1]<(s->>0)::integer+(s->>2)::integer and v[1]+v[3]>(s->>0)::integer and v[2]<(s->>1)::integer+(s->>3)::integer and v[2]+v[4]>(s->>1)::integer then return false; end if;
    end loop;
  end loop;
  r:=targets->0;start:=1+(((r->>1)::integer+(r->>3)::integer/2)/16)*96+((r->>0)::integer+(r->>2)::integer/2)/16;
  if blocked[start] then return false; end if;tail:=1;queue[1]:=start;seen[start]:=true;
  while head<=tail loop
    idx:=queue[head];head:=head+1;
    foreach nxt in array array[idx-1,idx+1,idx-96,idx+96] loop
      if nxt between 1 and 6144 and not blocked[nxt] and not seen[nxt] and (abs((nxt-1)%96-(idx-1)%96)<=1) then seen[nxt]:=true;tail:=tail+1;queue[tail]:=nxt; end if;
    end loop;
  end loop;
  for r in select * from jsonb_array_elements(targets) loop
    idx:=1+(((r->>1)::integer+(r->>3)::integer/2)/16)*96+((r->>0)::integer+(r->>2)::integer/2)/16;
    if not seen[idx] then return false; end if;
  end loop;
  return true;
exception when others then return false;
end $$;

create or replace function sz_workshop_private.prepare_submission() returns trigger
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); pending_count integer; daily_count integer;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'WORKSHOP_LOGIN_REQUIRED' using errcode='42501'; end if;
  if new.author_id<>uid then raise exception 'WORKSHOP_NOT_OWNER' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
  if not exists(select 1 from public.sz_workshop_admins where user_id=uid) then
    select count(*) filter(where status='pending'),count(*) filter(where created_at>now()-interval '24 hours') into pending_count,daily_count from public.sz_workshop_submissions where author_id=uid and (status='pending' or created_at>now()-interval '24 hours');
    if pending_count>=10 or daily_count>=10 then raise exception 'WORKSHOP_SUBMISSION_LIMIT' using errcode='P0001'; end if;
  end if;
  if not sz_workshop_private.project_valid(new.kind,new.payload,new.kind='map') or new.project_id<>new.payload->>'id' then raise exception 'WORKSHOP_INVALID_PROJECT' using errcode='22023'; end if;
  new.author_id:=uid;new.status:='pending';new.reviewed_at:=null;new.reviewed_by:=null;new.review_note:='';new.created_at:=now();new.title:=new.payload->>'name';
  select left(regexp_replace(coalesce(name,'Gracz'),'[<>[:cntrl:]]','','g'),40) into new.author_name from public.leaderboard where user_id=uid;
  new.author_name:=coalesce(nullif(new.author_name,''),'Gracz');return new;
end $$;

create table public.sz_workshop_map_policy (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default true,
 min_plays integer not null default 50 check(min_plays between 1 and 1000000),
 min_likes integer not null default 10 check(min_likes between 1 and 1000000),
 slots_per_mode integer not null default 1 check(slots_per_mode between 1 and 5),
 updated_at timestamptz not null default now()
);
insert into public.sz_workshop_map_policy(singleton) values(true);
alter table public.sz_workshop_map_policy enable row level security;
revoke all on public.sz_workshop_map_policy from public,anon,authenticated;
grant select on public.sz_workshop_map_policy to anon,authenticated;
create policy workshop_map_policy_read on public.sz_workshop_map_policy for select to anon,authenticated using(true);

create table public.sz_workshop_map_stats (
 item_id uuid primary key references public.sz_workshop_items(id) on delete cascade,
 mode text not null check(mode in ('classic','tdm','ctf')),
 plays bigint not null default 0 check(plays>=0),
 likes integer not null default 0 check(likes>=0),
 featured boolean not null default false,
 promoted_at timestamptz
);
alter table public.sz_workshop_map_stats enable row level security;
revoke all on public.sz_workshop_map_stats from public,anon,authenticated;
grant select on public.sz_workshop_map_stats to anon,authenticated;
create policy workshop_map_stats_read on public.sz_workshop_map_stats for select to anon,authenticated
 using(exists(select 1 from public.sz_workshop_items i where i.id=item_id and i.active and i.kind='map'));

create table public.sz_workshop_map_likes (
 item_id uuid not null references public.sz_workshop_map_stats(item_id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(item_id,user_id)
);
create index workshop_map_likes_user on public.sz_workshop_map_likes(user_id,item_id);
alter table public.sz_workshop_map_likes enable row level security;
revoke all on public.sz_workshop_map_likes from public,anon,authenticated;
grant select on public.sz_workshop_map_likes to authenticated;
create policy workshop_map_likes_own on public.sz_workshop_map_likes for select to authenticated using(user_id=(select auth.uid()));

create table sz_workshop_private.map_sessions (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 item_id uuid not null references public.sz_workshop_items(id) on delete cascade,
 release_id uuid not null references public.sz_workshop_releases(id) on delete cascade,
 mode text not null check(mode in ('classic','tdm','ctf')),
 created_at timestamptz not null default clock_timestamp(), finished_at timestamptz,
 counted boolean not null default false
);
create index workshop_map_sessions_rate on sz_workshop_private.map_sessions(user_id,item_id,finished_at desc) where counted;
create index workshop_map_sessions_started on sz_workshop_private.map_sessions(user_id,created_at desc);
create index workshop_map_sessions_item on sz_workshop_private.map_sessions(item_id);
create index workshop_map_sessions_release on sz_workshop_private.map_sessions(release_id);
alter table sz_workshop_private.map_sessions enable row level security;
revoke all on sz_workshop_private.map_sessions from public,anon,authenticated;

-- A short transaction lock serializes votes, counters, publication and ranking.
-- Ranking is recomputed only on a relevant change, never in the render loop.
create function sz_workshop_private.rank_maps() returns void language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('sz-workshop-map-pool',0));
 with eligible as (
  select s.item_id,row_number() over(partition by s.mode order by
   (s.likes::numeric*c.min_plays+s.plays::numeric*c.min_likes) desc,s.likes desc,s.plays desc,s.item_id) as position,c.slots_per_mode
  from public.sz_workshop_map_stats s
  join public.sz_workshop_items i on i.id=s.item_id and i.active and i.kind='map'
  join public.sz_workshop_releases r on r.item_id=i.id and r.version=i.latest_version
  cross join public.sz_workshop_map_policy c
  where c.enabled and s.mode=coalesce(r.payload->>'mode','tdm') and s.plays>=c.min_plays and s.likes>=c.min_likes
 ), chosen as (select item_id from eligible where position<=slots_per_mode)
 update public.sz_workshop_map_stats s set
  featured=exists(select 1 from chosen c where c.item_id=s.item_id),
  promoted_at=case when exists(select 1 from chosen c where c.item_id=s.item_id) then coalesce(s.promoted_at,now()) else null end
 where s.featured is distinct from exists(select 1 from chosen c where c.item_id=s.item_id);
end $$;

create function sz_workshop_private.sync_map_release() returns trigger language plpgsql security definer set search_path='' as $$
declare md text; previous text;
begin
 if not exists(select 1 from public.sz_workshop_items i where i.id=new.item_id and i.kind='map' and i.latest_version=new.version) then return new; end if;
 md:=coalesce(new.payload->>'mode','tdm');
 if md not in ('classic','tdm','ctf') then raise exception 'WORKSHOP_INVALID_PROJECT'; end if;
 perform pg_advisory_xact_lock(hashtextextended('sz-workshop-map-pool',0));
 select mode into previous from public.sz_workshop_map_stats where item_id=new.item_id;
 if previous is not null and previous<>md then
  delete from public.sz_workshop_map_likes where item_id=new.item_id;
  update public.sz_workshop_map_stats set mode=md,plays=0,likes=0,featured=false,promoted_at=null where item_id=new.item_id;
 else
  insert into public.sz_workshop_map_stats(item_id,mode) values(new.item_id,md) on conflict(item_id) do nothing;
 end if;
 perform sz_workshop_private.rank_maps();return new;
end $$;
create trigger workshop_map_release after insert on public.sz_workshop_releases for each row execute function sz_workshop_private.sync_map_release();
create function sz_workshop_private.rerank_map_visibility() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='map' and old.active is distinct from new.active then perform sz_workshop_private.rank_maps(); end if;return new;
end $$;
create trigger workshop_map_visibility after update of active on public.sz_workshop_items for each row execute function sz_workshop_private.rerank_map_visibility();

insert into public.sz_workshop_map_stats(item_id,mode)
 select i.id,coalesce(r.payload->>'mode','tdm') from public.sz_workshop_items i
 join public.sz_workshop_releases r on r.item_id=i.id and r.version=i.latest_version where i.kind='map';

create or replace view public.sz_workshop_catalog with(security_invoker=true) as
select i.id,i.kind,i.title,i.author_name,i.latest_version as version,r.id as release_id,i.updated_at,
 r.payload->>'weapon' as weapon,r.payload->>'model' as model,r.payload->>'theme' as theme,
 case when i.kind='map' then coalesce(r.payload->>'mode','tdm') end as mode,
 coalesce(s.plays,0) as plays,coalesce(s.likes,0) as likes,coalesce(s.featured,false) as featured,s.promoted_at
from public.sz_workshop_items i join public.sz_workshop_releases r on r.item_id=i.id and r.version=i.latest_version
left join public.sz_workshop_map_stats s on s.item_id=i.id where i.active;

create function sz_workshop_private.map_action(action text,args jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); target uuid; rel uuid; nonce uuid; md text; n integer; want boolean;
 s sz_workshop_private.map_sessions%rowtype; policy public.sz_workshop_map_policy%rowtype;
begin
 if args is null or jsonb_typeof(args)<>'object' then raise exception 'WORKSHOP_MAP_INPUT'; end if;
 if action='state' then
  return jsonb_build_object('policy',(select to_jsonb(p)-'singleton' from public.sz_workshop_map_policy p),
   'liked',coalesce((select jsonb_agg(item_id) from public.sz_workshop_map_likes where user_id=uid),'[]'::jsonb));
 end if;
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'WORKSHOP_LOGIN_REQUIRED' using errcode='42501'; end if;
 if action='settings' then
  if not exists(select 1 from public.sz_workshop_admins where user_id=uid) then raise exception 'WORKSHOP_ADMIN_REQUIRED' using errcode='42501'; end if;
  if jsonb_typeof(args->'enabled') is distinct from 'boolean' or coalesce(args->>'min_plays','')!~'^[1-9][0-9]{0,6}$'
   or coalesce(args->>'min_likes','')!~'^[1-9][0-9]{0,6}$' or coalesce(args->>'slots_per_mode','')!~'^[1-5]$'
   or (args->>'min_plays')::integer>1000000 or (args->>'min_likes')::integer>1000000 then raise exception 'WORKSHOP_MAP_INPUT'; end if;
  perform pg_advisory_xact_lock(hashtextextended('sz-workshop-map-pool',0));
  update public.sz_workshop_map_policy set enabled=(args->>'enabled')::boolean,min_plays=(args->>'min_plays')::integer,
   min_likes=(args->>'min_likes')::integer,slots_per_mode=(args->>'slots_per_mode')::integer,updated_at=now() where singleton returning * into policy;
  perform sz_workshop_private.rank_maps();return to_jsonb(policy)-'singleton';
 elsif action='like' then
  target:=(args->>'item')::uuid;
  if jsonb_typeof(args->'liked') is distinct from 'boolean' then raise exception 'WORKSHOP_MAP_INPUT'; end if;want:=(args->>'liked')::boolean;
  perform pg_advisory_xact_lock(hashtextextended('sz-workshop-map-pool',0));
  if not exists(select 1 from public.sz_workshop_items i join public.sz_workshop_map_stats m on m.item_id=i.id where i.id=target and i.active and i.kind='map') then raise exception 'WORKSHOP_MAP_NOT_FOUND'; end if;
  if want then
   insert into public.sz_workshop_map_likes(item_id,user_id) values(target,uid) on conflict do nothing;get diagnostics n=row_count;
  else delete from public.sz_workshop_map_likes where item_id=target and user_id=uid;get diagnostics n=row_count;end if;
  update public.sz_workshop_map_stats set likes=likes+case when want then n else -n end where item_id=target;
  perform sz_workshop_private.rank_maps();return jsonb_build_object('liked',want);
 elsif action='start' then
  rel:=(args->>'release')::uuid;nonce:=(args->>'session')::uuid;md:=args->>'mode';
  if nonce is null or md is null then raise exception 'WORKSHOP_MAP_INPUT'; end if;
  perform pg_advisory_xact_lock(hashtextextended('sz-workshop-map-pool',0));
  select * into s from sz_workshop_private.map_sessions where id=nonce;
  if found then
   if s.user_id<>uid or s.release_id<>rel or s.mode<>md then raise exception 'WORKSHOP_PLAY_ID'; end if;
   return jsonb_build_object('session',s.id,'counted',s.counted);
  end if;
  select i.id into target from public.sz_workshop_items i join public.sz_workshop_releases r on r.item_id=i.id
   join public.sz_workshop_map_stats m on m.item_id=i.id
   where r.id=rel and i.active and i.kind='map' and coalesce(r.payload->>'mode','tdm')=md and m.mode=md;
  if target is null then raise exception 'WORKSHOP_MAP_NOT_FOUND'; end if;
  if (select count(*) from sz_workshop_private.map_sessions where user_id=uid and created_at>now()-interval '1 hour')>=60 then raise exception 'WORKSHOP_PLAY_RATE'; end if;
  insert into sz_workshop_private.map_sessions(id,user_id,item_id,release_id,mode) values(nonce,uid,target,rel,md);
  return jsonb_build_object('session',nonce,'counted',false);
 elsif action='finish' then
  nonce:=(args->>'session')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('sz-workshop-map-pool',0));
  select * into s from sz_workshop_private.map_sessions where id=nonce and user_id=uid for update;
  if not found then raise exception 'WORKSHOP_PLAY_ID'; end if;
  if s.finished_at is not null then return jsonb_build_object('counted',s.counted); end if;
  if clock_timestamp()<s.created_at+interval '60 seconds' then return jsonb_build_object('counted',false,'retry_after',ceil(extract(epoch from s.created_at+interval '60 seconds'-clock_timestamp()))); end if;
  want:=exists(select 1 from public.sz_workshop_items i join public.sz_workshop_map_stats m on m.item_id=i.id where i.id=s.item_id and i.active and m.mode=s.mode)
   and not exists(select 1 from sz_workshop_private.map_sessions p where p.user_id=uid and p.item_id=s.item_id and p.counted and p.finished_at>now()-interval '5 minutes');
  update sz_workshop_private.map_sessions set finished_at=clock_timestamp(),counted=want where id=nonce;
  if want then update public.sz_workshop_map_stats set plays=plays+1 where item_id=s.item_id;perform sz_workshop_private.rank_maps();end if;
  return jsonb_build_object('counted',want);
 end if;
 raise exception 'WORKSHOP_MAP_INPUT';
end $$;

revoke execute on function sz_workshop_private.rank_maps(),sz_workshop_private.sync_map_release(),sz_workshop_private.rerank_map_visibility(),sz_workshop_private.map_action(text,jsonb) from public,anon,authenticated;
grant usage on schema sz_workshop_private to anon;
grant execute on function sz_workshop_private.map_action(text,jsonb) to anon,authenticated;
create function public.sz_workshop_map(action text,args jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select sz_workshop_private.map_action(action,args) $$;
revoke execute on function public.sz_workshop_map(text,jsonb) from public,anon,authenticated;
grant execute on function public.sz_workshop_map(text,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
