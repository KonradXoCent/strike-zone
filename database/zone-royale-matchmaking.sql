-- Short-lived matchmaking records. Only the authenticated command may allocate
-- seats; players cannot write a roster, team or host directly.
create schema if not exists zone_royale_private;
revoke all on schema zone_royale_private from public,anon,authenticated;
create table if not exists zone_royale_private.matches(
 id uuid primary key default gen_random_uuid(),room text not null unique,
 mode text not null check(mode in ('solo','duo','trio','squad')),map integer not null check(map in (6,7,8)),
 host_id uuid not null references auth.users(id) on delete cascade,host_cid text not null,
 host_seen timestamptz not null default now(),closes_at timestamptz not null default (now()+interval '15 seconds'),
 phase text not null default 'waiting' check(phase in ('waiting','running')),created_at timestamptz not null default now()
);
alter table zone_royale_private.matches add column if not exists protocol integer not null default 2 check(protocol in(2,3,4,5));
alter table zone_royale_private.matches drop constraint if exists matches_protocol_check;
alter table zone_royale_private.matches add constraint matches_protocol_check check(protocol in(2,3,4,5));
alter table zone_royale_private.matches add column if not exists ranked boolean not null default false;
create index if not exists zr_waiting_ranked on zone_royale_private.matches(mode,ranked,protocol,map,closes_at) where phase='waiting';
create index if not exists zr_host_user on zone_royale_private.matches(host_id);
create index if not exists zr_match_expiry on zone_royale_private.matches(created_at);
create index if not exists zr_waiting on zone_royale_private.matches(mode,closes_at) where phase='waiting';
create table if not exists zone_royale_private.parties(
 match_id uuid not null references zone_royale_private.matches(id) on delete cascade,
 ticket uuid not null,team integer not null,expected integer not null check(expected between 1 and 4),fill boolean not null,
 primary key(match_id,ticket)
);
create index if not exists zr_party_ticket on zone_royale_private.parties(ticket,match_id);
create table if not exists zone_royale_private.members(
 user_id uuid primary key references auth.users(id) on delete cascade,
 match_id uuid not null references zone_royale_private.matches(id) on delete cascade,
 ticket uuid not null,cid text not null,name text not null,outfit text,chute text,
 joined_at timestamptz not null default now(),last_seen timestamptz not null default now(),
 foreign key(match_id,ticket) references zone_royale_private.parties(match_id,ticket) on delete cascade,
 unique(match_id,cid)
);
create index if not exists zr_members_party on zone_royale_private.members(match_id,ticket);
alter table zone_royale_private.matches enable row level security;
alter table zone_royale_private.parties enable row level security;
alter table zone_royale_private.members enable row level security;
revoke all on all tables in schema zone_royale_private from public,anon,authenticated;

create or replace function zone_royale_private.command(action text,args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();m zone_royale_private.matches;member zone_royale_private.members;party zone_royale_private.parties;
 protocol integer;mode text;cid text;ticket uuid;size integer;expected integer;fill boolean;ranked boolean;team integer;new_id uuid;new_room text;roster jsonb;name text;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args)<>'object' or octet_length(args::text)>4096 then raise exception 'ZR_QUEUE_INPUT';end if;
 cid:=args->>'cid';if cid is null or cid !~ '^[a-zA-Z0-9_-]{4,64}$' then raise exception 'ZR_QUEUE_INPUT';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('zone-royale-queue',167));
 delete from zone_royale_private.matches where created_at<now()-interval '2 hours';
 select * into member from zone_royale_private.members where user_id=uid;
 if action='leave' then
  if member.cid=cid then
   delete from zone_royale_private.members where user_id=uid;
   delete from zone_royale_private.parties p where p.match_id=member.match_id and not exists(select 1 from zone_royale_private.members x where x.match_id=p.match_id and x.ticket=p.ticket);
   delete from zone_royale_private.matches x where x.id=member.match_id and not exists(select 1 from zone_royale_private.members y where y.match_id=x.id);
  end if;return '{}'::jsonb;
 end if;
 if action='join' then
  protocol:=case when args->>'protocol' in ('3','4','5') then (args->>'protocol')::integer else 2 end;mode:=args->>'mode';size:=case mode when 'solo' then 1 when 'duo' then 2 when 'trio' then 3 when 'squad' then 4 else 0 end;
  if size=0 or coalesce(args->>'party','') !~ '^[a-f0-9-]{36}$' or coalesce(args->>'expected','') !~ '^[1-4]$' or coalesce(args->>'map','') !~ '^[678]$' or jsonb_typeof(args->'fill')<>'boolean' then raise exception 'ZR_QUEUE_INPUT';end if;
  if args ? 'ranked' and jsonb_typeof(args->'ranked')<>'boolean' then raise exception 'ZR_QUEUE_INPUT';end if;
  ranked:=protocol=5 and coalesce((args->>'ranked')::boolean,false);
  ticket:=(args->>'party')::uuid;expected:=(args->>'expected')::integer;fill:=(args->>'fill')::boolean;
  if expected>size then raise exception 'ROYALE_PARTY_SIZE';end if;
  if member.user_id is not null then
   select * into m from zone_royale_private.matches where id=member.match_id;
   if member.cid<>cid or member.ticket<>ticket or m.mode<>mode or m.protocol<>protocol or m.ranked<>ranked then delete from zone_royale_private.members where user_id=uid;member:=null;m:=null;end if;
  end if;
  if member.user_id is null then
   delete from zone_royale_private.members x using zone_royale_private.matches y where x.match_id=y.id and y.phase='waiting' and x.last_seen<now()-interval '30 seconds';
   delete from zone_royale_private.parties p where not exists(select 1 from zone_royale_private.members x where x.match_id=p.match_id and x.ticket=p.ticket);
   select x.* into m from zone_royale_private.matches x join zone_royale_private.parties p on p.match_id=x.id where x.mode=mode and x.protocol=protocol and x.ranked=ranked and x.map=(args->>'map')::integer and x.phase='waiting' and x.closes_at>now() and p.ticket=ticket order by x.created_at limit 1;
   if m.id is null then
    select x.* into m from zone_royale_private.matches x where x.mode=mode and x.protocol=protocol and x.ranked=ranked and x.map=(args->>'map')::integer and x.phase='waiting' and x.closes_at>now() and x.host_seen>now()-interval '10 seconds' and coalesce((select sum(p.expected) from zone_royale_private.parties p where p.match_id=x.id),0)+expected<=36 order by x.created_at limit 1;
   end if;
   if m.id is null then
    new_id:=gen_random_uuid();new_room:=upper(left(replace(new_id::text,'-',''),6));
    insert into zone_royale_private.matches(id,room,mode,protocol,ranked,map,host_id,host_cid) values(new_id,new_room,mode,protocol,ranked,(args->>'map')::integer,uid,cid) returning * into m;
   end if;
   select * into party from zone_royale_private.parties p where p.match_id=m.id and p.ticket=ticket;
   if party.ticket is null then
    team:=null;
    if fill then select p.team into team from zone_royale_private.parties p where p.match_id=m.id group by p.team having bool_and(p.fill) and sum(p.expected)+expected<=size order by sum(p.expected) desc,p.team limit 1;end if;
    if team is null then select coalesce(max(p.team),-1)+1 into team from zone_royale_private.parties p where p.match_id=m.id;end if;
    insert into zone_royale_private.parties(match_id,ticket,team,expected,fill) values(m.id,ticket,team,expected,fill) returning * into party;
   elsif party.expected<>expected or party.fill<>fill then raise exception 'ZR_QUEUE_PARTY_CHANGED';end if;
   if (select count(*) from zone_royale_private.members x where x.match_id=m.id and x.ticket=ticket)>=party.expected then raise exception 'ROYALE_PARTY_SIZE';end if;
   select l.name into name from public.leaderboard l where l.user_id=uid;name:=left(regexp_replace(coalesce(name,args->>'name','Player'),'[<>&]','','g'),14);
   insert into zone_royale_private.members(user_id,match_id,ticket,cid,name,outfit,chute) values(uid,m.id,ticket,cid,name,case when args->>'outfit' ~ '^o:[0-9]{1,6}$' then args->>'outfit' end,case when args->>'chute' ~ '^c:[0-9]{1,6}$' then args->>'chute' end) returning * into member;
  end if;
 elsif action not in ('status','launch') then raise exception 'ZR_QUEUE_INPUT';end if;
 if member.user_id is null or member.cid<>cid then raise exception 'ZR_QUEUE_GONE';end if;
 update zone_royale_private.members set last_seen=now() where user_id=uid;
 select * into m from zone_royale_private.matches where id=member.match_id;
 if m.phase='waiting' and (m.host_seen<now()-interval '10 seconds' or not exists(select 1 from zone_royale_private.members x where x.user_id=m.host_id and x.match_id=m.id)) then
  update zone_royale_private.matches set (host_id,host_cid,host_seen)=(select x.user_id,x.cid,now() from zone_royale_private.members x where x.match_id=m.id and x.last_seen>now()-interval '10 seconds' order by x.joined_at limit 1) where id=m.id returning * into m;
 end if;
 if m.host_id=uid then update zone_royale_private.matches set host_seen=now() where id=m.id;end if;
 if action='launch' then
  if m.host_id<>uid or m.closes_at>now() then raise exception 'ZR_QUEUE_NOT_READY';end if;
  update zone_royale_private.matches set phase='running' where id=m.id returning * into m;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('cid',x.cid,'uid',x.user_id,'n',x.name,'team',p.team,'fill',p.fill,'outfit',x.outfit,'chute',x.chute) order by x.joined_at),'[]') into roster from zone_royale_private.members x join zone_royale_private.parties p on p.match_id=x.match_id and p.ticket=x.ticket where x.match_id=m.id;
 return jsonb_build_object('protocol',m.protocol,'id',m.id,'room',m.room,'host',m.host_cid,'mode',m.mode,'ranked',m.ranked,'map',m.map,'phase',m.phase,'remaining',greatest(0,extract(epoch from m.closes_at-now())),'roster',roster);
end $$;
revoke all on function zone_royale_private.command(text,jsonb) from public,anon;
grant usage on schema zone_royale_private to authenticated;
grant execute on function zone_royale_private.command(text,jsonb) to authenticated;
create or replace function public.zone_royale_queue(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select zone_royale_private.command(action,args) $$;
revoke all on function public.zone_royale_queue(text,jsonb) from public,anon;
grant execute on function public.zone_royale_queue(text,jsonb) to authenticated;
