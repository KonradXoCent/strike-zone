-- Original cooperative ghost investigations. Private data and host-bound broadcasts.
create schema if not exists haunt_private;
revoke all on schema haunt_private from public,anon;
grant usage on schema haunt_private to authenticated;
create table if not exists haunt_private.rooms(
 id uuid primary key default gen_random_uuid(),code text unique not null,host_id uuid not null references auth.users(id),
 phase text not null default 'lobby' check(phase in ('lobby','running','complete','closed')),
 map_id text not null default 'pinewood' check(map_id in ('pinewood','alder','ironvale')),
 difficulty text not null default 'normal' check(difficulty in ('calm','normal','nightmare')),bots boolean not null default true,
 seed integer not null,roster jsonb not null default '[]',snapshot jsonb,created_at timestamptz not null default now(),
 started_at timestamptz,updated_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '30 minutes'
);
create table if not exists haunt_private.members(
 room_id uuid not null references haunt_private.rooms(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,
 ready boolean not null default false,active boolean not null default true,last_seen timestamptz not null default now(),input jsonb not null default '{}',primary key(room_id,user_id)
);
alter table haunt_private.members add column if not exists active boolean not null default true;
create index if not exists haunt_member_user on haunt_private.members(user_id,last_seen desc);
create index if not exists haunt_rooms_live on haunt_private.rooms(expires_at) where phase in ('lobby','running');
create table if not exists haunt_private.results(room_id uuid not null references haunt_private.rooms(id),user_id uuid not null references auth.users(id),correct boolean not null,survived boolean not null,evidence integer not null,xp integer not null,created_at timestamptz not null default now(),primary key(room_id,user_id));
create index if not exists haunt_rooms_host on haunt_private.rooms(host_id,created_at desc);
create index if not exists haunt_results_user on haunt_private.results(user_id,created_at desc);
alter table haunt_private.rooms enable row level security;
alter table haunt_private.members enable row level security;
alter table haunt_private.results enable row level security;
revoke all on all tables in schema haunt_private from public,anon,authenticated;

create or replace function haunt_private.room_view(room uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();r haunt_private.rooms;people jsonb;
begin
 select * into r from haunt_private.rooms where id=room and expires_at>now();
 if r.id is null or not exists(select 1 from haunt_private.members where room_id=room and user_id=uid and active) then raise exception 'HAUNT_ROOM' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(l.name,'Investigator'),'image',l.avimg,'ready',m.ready,'online',m.last_seen>now()-interval '25 seconds') order by m.user_id),'[]') into people from haunt_private.members m left join public.leaderboard l on l.user_id=m.user_id where m.room_id=room and m.active;
 return jsonb_build_object('id',r.id,'code',r.code,'hostId',r.host_id,'phase',r.phase,'mapId',r.map_id,'difficulty',r.difficulty,'bots',r.bots,'members',people,'seed',case when uid=r.host_id then r.seed end,'snapshot',r.snapshot,'roster',r.roster,'inputs',case when uid=r.host_id then coalesce((select jsonb_object_agg(m.user_id::text,m.input) from haunt_private.members m where m.room_id=room and m.active),'{}') else '{}' end);
end $$;
revoke all on function haunt_private.room_view(uuid) from public,anon,authenticated;

create or replace function haunt_private.lobby_command(action text,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();r haunt_private.rooms;room uuid;vcode text;slot integer;doc jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HAUNT_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>70000 then raise exception 'HAUNT_INPUT';end if;
 if action='home' then
  select m.room_id into room from haunt_private.members m join haunt_private.rooms q on q.id=m.room_id where m.user_id=uid and m.active and q.phase in ('lobby','running') and q.expires_at>now() order by m.last_seen desc limit 1;
  return jsonb_build_object('room',case when room is not null then haunt_private.room_view(room) end,'progress',(select jsonb_build_object('contracts',count(*),'correct',count(*) filter(where s.correct),'xp',coalesce(sum(s.xp),0)) from haunt_private.results s where user_id=uid));
 elsif action='create' then
  if not exists(select 1 from public.zh_library where user_id=uid and game_id='zone-haunt') then raise exception 'HUB_LIBRARY';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,934));
  if (select count(*) from haunt_private.rooms where host_id=uid and created_at>now()-interval '10 minutes')>=10 then raise exception 'HAUNT_RATE';end if;
  if exists(select 1 from haunt_private.members m join haunt_private.rooms q on q.id=m.room_id where m.user_id=uid and m.active and q.phase in ('lobby','running') and q.expires_at>now()) then raise exception 'HAUNT_ALREADY';end if;
  for slot in 1..4 loop
   vcode:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
   begin insert into haunt_private.rooms(code,host_id,seed) values(vcode,uid,1+floor(random()*2147483645)::integer) returning id into room;exit;exception when unique_violation then if slot=4 then raise;end if;end;
  end loop;
  insert into haunt_private.members(room_id,user_id,ready) values(room,uid,true);
  return haunt_private.room_view(room);
 elsif action='join' then
  vcode:=upper(btrim(args->>'code'));if vcode is null or vcode!~'^[A-F0-9]{6}$' then raise exception 'HAUNT_CODE';end if;
  select * into r from haunt_private.rooms where code=vcode and expires_at>now() for update;
  if r.id is null or r.phase not in ('lobby','running') then raise exception 'HAUNT_ROOM';end if;
  if exists(select 1 from haunt_private.members where room_id=r.id and user_id=uid and active) then update haunt_private.members set last_seen=now() where room_id=r.id and user_id=uid and active;return haunt_private.room_view(r.id);end if;
  if r.phase<>'lobby' then raise exception 'HAUNT_STARTED';end if;
  if not exists(select 1 from public.zh_library where user_id=uid and game_id='zone-haunt') then raise exception 'HUB_LIBRARY';end if;
  if exists(select 1 from haunt_private.members m join haunt_private.rooms q on q.id=m.room_id where m.user_id=uid and m.active and q.phase in ('lobby','running') and q.expires_at>now()) then raise exception 'HAUNT_ALREADY';end if;
  if (select count(*) from haunt_private.members where room_id=r.id and active)>=4 then raise exception 'HAUNT_FULL';end if;
  insert into haunt_private.members(room_id,user_id) values(r.id,uid) on conflict(room_id,user_id) do update set active=true,ready=false,last_seen=now(),input='{}';return haunt_private.room_view(r.id);
 end if;
 raise exception 'HAUNT_ACTION';
end $$;
revoke all on function haunt_private.lobby_command(text,jsonb) from public,anon,authenticated;

create or replace function haunt_private.member_command(action text,args jsonb,r haunt_private.rooms) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();room uuid:=r.id;doc jsonb;
begin
 if auth.uid() is null then raise exception 'HAUNT_LOGIN' using errcode='42501';end if;
 if action='leave' then
  if r.host_id=uid then update haunt_private.rooms set phase='closed',updated_at=now() where id=room;end if;
  update haunt_private.members set active=false,ready=false,input='{}' where room_id=room and user_id=uid and active;return '{}';
 elsif action='configure' then
  if r.host_id<>uid or r.phase<>'lobby' then raise exception 'HAUNT_HOST' using errcode='42501';end if;
  if coalesce(args->>'mapId','') not in ('pinewood','alder','ironvale') or coalesce(args->>'difficulty','') not in ('calm','normal','nightmare') or jsonb_typeof(args->'bots') is distinct from 'boolean' then raise exception 'HAUNT_INPUT';end if;
  update haunt_private.rooms set map_id=args->>'mapId',difficulty=args->>'difficulty',bots=(args->>'bots')::boolean,updated_at=now() where id=room;
 elsif action='ready' then
  if r.phase<>'lobby' or jsonb_typeof(args->'ready') is distinct from 'boolean' then raise exception 'HAUNT_INPUT';end if;
  update haunt_private.members set ready=(args->>'ready')::boolean where room_id=room and user_id=uid and active;
 elsif action='start' then
  if r.host_id<>uid or r.phase<>'lobby' then raise exception 'HAUNT_HOST' using errcode='42501';end if;
  if exists(select 1 from haunt_private.members where room_id=room and active and (not ready or last_seen<now()-interval '25 seconds')) then raise exception 'HAUNT_NOT_READY';end if;
  doc:=haunt_private.room_view(room);
  update haunt_private.rooms set phase='running',roster=doc->'members',started_at=now(),updated_at=now() where id=room;
 else raise exception 'HAUNT_ACTION';end if;
 return haunt_private.room_view(room);
end $$;
revoke all on function haunt_private.member_command(text,jsonb,haunt_private.rooms) from public,anon,authenticated;

create or replace function haunt_private.match_command(action text,args jsonb,r haunt_private.rooms) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();room uuid:=r.id;doc jsonb;guess text;correct boolean;ev integer;xp integer;person jsonb;survived boolean;ghosts text[]:=array['wisp','lament','cinder','watcher','veil','morrow','echo','thorn'];
begin
 if auth.uid() is null then raise exception 'HAUNT_LOGIN' using errcode='42501';end if;
 if action='sync' then
  if args ? 'input' then
   if jsonb_typeof(args->'input') is distinct from 'object' or octet_length((args->'input')::text)>2048 then raise exception 'HAUNT_INPUT';end if;
   update haunt_private.members set input=args->'input' where room_id=room and user_id=uid and active;
  end if;
  if args ? 'snapshot' then
   if uid<>r.host_id or r.phase<>'running' then raise exception 'HAUNT_HOST' using errcode='42501';end if;
   doc:=args->'snapshot';if jsonb_typeof(doc) is distinct from 'object' or (doc->>'schema') is distinct from '1' or (doc->>'id') is distinct from room::text or (doc->>'mapId') is distinct from r.map_id or jsonb_typeof(doc->'players') is distinct from 'array' or jsonb_array_length(doc->'players')>4 then raise exception 'HAUNT_INPUT';end if;
   update haunt_private.rooms set snapshot=doc,updated_at=now() where id=room;
  end if;
 elsif action='finish' then
  if uid<>r.host_id then raise exception 'HAUNT_HOST' using errcode='42501';end if;
  if r.phase='complete' then return haunt_private.room_view(room);end if;
  if r.phase<>'running' or r.started_at>now()-interval '30 seconds' then raise exception 'HAUNT_EARLY';end if;
  guess:=args->>'guess';correct:=guess=ghosts[1+r.seed%8];ev:=least(3,coalesce(jsonb_array_length(r.snapshot->'found'),0));xp:=case when correct then 100+ev*25+(case when r.snapshot->'objectives'->>'hunt'='true' then 25 else 0 end)+(case when r.snapshot->'objectives'->>'photo'='true' then 25 else 0 end) else ev*10 end;
  for person in select value from jsonb_array_elements(r.roster) loop
   survived:=exists(select 1 from jsonb_array_elements(coalesce(r.snapshot->'players','[]')) p where p->>'id'=person->>'id' and p->>'alive'='true');
   insert into haunt_private.results(room_id,user_id,correct,survived,evidence,xp) values(room,(person->>'id')::uuid,coalesce(correct,false),survived,ev,xp) on conflict do nothing;
  end loop;
  update haunt_private.rooms set phase='complete',updated_at=now() where id=room;
 else raise exception 'HAUNT_ACTION';end if;
 return haunt_private.room_view(room);
end $$;
revoke all on function haunt_private.match_command(text,jsonb,haunt_private.rooms) from public,anon,authenticated;

create or replace function haunt_private.command(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();r haunt_private.rooms;room uuid;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HAUNT_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>70000 then raise exception 'HAUNT_INPUT';end if;
 if action in ('home','create','join') then return haunt_private.lobby_command(action,args);end if;
 if coalesce(args->>'room','')!~'^[a-f0-9-]{36}$' then raise exception 'HAUNT_ROOM';end if;room:=(args->>'room')::uuid;
 select * into r from haunt_private.rooms where id=room and expires_at>now() for update;
 if r.id is null or not exists(select 1 from haunt_private.members where room_id=room and user_id=uid and active) then raise exception 'HAUNT_ROOM' using errcode='42501';end if;
 update haunt_private.members set last_seen=now() where room_id=room and user_id=uid and active;
 if action in ('sync','finish') then return haunt_private.match_command(action,args,r);end if;
 return haunt_private.member_command(action,args,r);
end $$;
revoke all on function haunt_private.command(text,jsonb) from public,anon;
grant execute on function haunt_private.command(text,jsonb) to authenticated;
create or replace function public.zone_haunt(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select haunt_private.command(action,args) $$;
revoke all on function public.zone_haunt(text,jsonb) from public,anon;
grant execute on function public.zone_haunt(text,jsonb) to authenticated;

create or replace function haunt_private.channel_allowed(topic text,writing boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();room uuid;r haunt_private.rooms;parts text[]:=string_to_array(topic,':');
begin
 if uid is null or topic!~'^zh-haunt:[a-f0-9-]{36}:(state|input:[a-f0-9-]{36})$' then return false;end if;
 begin room:=parts[2]::uuid;exception when invalid_text_representation then return false;end;
 select * into r from haunt_private.rooms where id=room and expires_at>now() and phase in ('lobby','running');
 if r.id is null or not exists(select 1 from haunt_private.members where room_id=room and user_id=uid and active) then return false;end if;
 if parts[3]='state' then return not writing or r.host_id=uid;end if;
 return case when writing then parts[4]=uid::text else r.host_id=uid or parts[4]=uid::text end;
end $$;
revoke all on function haunt_private.channel_allowed(text,boolean) from public,anon;
grant execute on function haunt_private.channel_allowed(text,boolean) to authenticated;
do $$ begin
 if to_regclass('realtime.messages') is not null then
  if not exists(select 1 from pg_catalog.pg_policies where schemaname='realtime' and tablename='messages' and policyname='zone_haunt_receive') then
   execute 'create policy zone_haunt_receive on realtime.messages for select to authenticated using (extension=''broadcast'' and haunt_private.channel_allowed((select realtime.topic()),false))';
  end if;
  if not exists(select 1 from pg_catalog.pg_policies where schemaname='realtime' and tablename='messages' and policyname='zone_haunt_send') then
   execute 'create policy zone_haunt_send on realtime.messages for insert to authenticated with check (extension=''broadcast'' and haunt_private.channel_allowed((select realtime.topic()),true))';
  end if;
 end if;
end $$;
insert into public.zh_games(id,title,description_pl,description_en,tags,free,published,package_config) values('zone-haunt','Zone Haunt',
 'Kooperacyjne śledztwa paranormalne 2.5D. Osiem typów duchów, siedem rodzajów dowodów, EMF, termometr, radio i bezpieczne szafy. Graj z botami lub ekipą do 4 osób.',
 'Cooperative 2.5D paranormal investigations. Eight ghosts, seven evidence types, EMF, thermometer, spirit radio and safe closets. Play with bots or up to four investigators.',
 array['Co-op','Horror','2.5D','Bots'],true,false,'{"protocol":1,"executable":"ZoneHaunt.exe","manifestName":"zonehub-haunt-manifest.json","releasePrefix":"haunt-v"}')
on conflict(id) do update set title=excluded.title,description_pl=excluded.description_pl,description_en=excluded.description_en,tags=excluded.tags,package_config=excluded.package_config;

insert into public.zh_achievement_definitions(id,game_id,title,description,xp) values
 ('zh-first','zone-haunt','First case','Complete your first paranormal investigation',25),
 ('zh-identified','zone-haunt','Case closed','Correctly identify an entity',50),
 ('zh-evidence','zone-haunt','Field researcher','Collect all three evidence types in one contract',50),
 ('zh-survivor','zone-haunt','Back before dawn','Survive a correctly solved contract',50),
 ('zh-veteran','zone-haunt','Bureau veteran','Correctly solve five contracts',100)
on conflict(game_id,id) do update set game_id=excluded.game_id,title=excluded.title,description=excluded.description,xp=excluded.xp;
create or replace function haunt_private.decorate_profile(value jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid:=(value->>'id')::uuid;earned jsonb;points integer;
begin
 select coalesce(jsonb_agg(id),'[]') into earned from (values
 ('zh-first',exists(select 1 from haunt_private.results where user_id=target)),
 ('zh-identified',exists(select 1 from haunt_private.results where user_id=target and correct)),
 ('zh-evidence',exists(select 1 from haunt_private.results where user_id=target and evidence=3)),
 ('zh-survivor',exists(select 1 from haunt_private.results where user_id=target and correct and survived)),
 ('zh-veteran',(select count(*)>=5 from haunt_private.results where user_id=target and correct))) b(id,unlocked) where unlocked;
 select coalesce(sum(d.xp),0)::integer into points from public.zh_achievement_definitions d where d.game_id='zone-haunt' and earned ? d.id;
 return value||jsonb_build_object('achievements',coalesce(value->'achievements','[]')||earned,'achievementsByGame',coalesce(value->'achievementsByGame','{}')||jsonb_build_object('zone-haunt',earned),'xp',coalesce((value->>'xp')::integer,0)+points,'level',1+(coalesce((value->>'xp')::integer,0)+points)/250,'levelProgress',(coalesce((value->>'xp')::integer,0)+points)%250);
end $$;
revoke all on function haunt_private.decorate_profile(jsonb) from public,anon,authenticated;
create or replace function zone_hub_private.haunt_hub_command(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();result jsonb;wanted jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>(case when action='account_update' then 262144 else 8192 end) then raise exception 'HUB_INPUT';end if;
 if action='edit_profile' and coalesce(args->'pinned','[]')::text like '%zh-%' then
  wanted:=args->'pinned';if jsonb_typeof(wanted) is distinct from 'array' or jsonb_array_length(wanted)>3 then raise exception 'HUB_BADGE';end if;
  result:=haunt_private.decorate_profile(zone_hub_private.decorate_profile(zone_hub_private.profile(uid,uid),uid));
  if exists(select 1 from jsonb_array_elements_text(wanted) x where not(result->'achievements' ? x)) then raise exception 'HUB_BADGE';end if;
  result:=zone_hub_private.style_command(action,args||jsonb_build_object('pinned',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements_text(wanted) x where x not like 'zh-%')));
  update public.zh_profiles set pinned=array(select distinct jsonb_array_elements_text(wanted)) where user_id=uid;
  return result;
 end if;
 result:=zone_hub_private.style_command(action,args);
 if action in ('home','profile') and result->'profile' is not null then result:=jsonb_set(result,'{profile}',haunt_private.decorate_profile(result->'profile'));end if;
 return result;
end $$;
revoke all on function zone_hub_private.haunt_hub_command(text,jsonb) from public,anon;
grant execute on function zone_hub_private.haunt_hub_command(text,jsonb) to authenticated;
create or replace function public.zone_hub(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select zone_hub_private.haunt_hub_command(action,args) $$;
