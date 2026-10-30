-- Zone Haunt protocol 5. Apply after haunt-fieldwork.sql.
-- New contracts include basements, 19 sites, team room declarations and 15 entities.
-- Existing protocols and immutable results retain their previous reward rules.
select zone_wallet_private.lock();
alter table haunt_private.rooms drop constraint if exists rooms_protocol_check;
alter table haunt_private.rooms add constraint rooms_protocol_check check(protocol in (1,2,3,4,5));
alter table haunt_private.map_catalog add column if not exists room_count integer not null default 64;
alter table haunt_private.map_catalog add column if not exists sink_ids jsonb not null default '[]';
insert into haunt_private.map_catalog(id,min_level,size,area,room_count,sink_ids) values
('willow',1,'small',576,6,'["sink-0"]'),
('harvest',1,'small',896,6,'["sink-1"]'),
('pinewood',2,'small',1020,7,'["sink-1"]'),
('marshchapel',3,'small',1088,5,'["sink-2"]'),
('nightmarket',2,'medium',1280,7,'["sink-1", "sink-4"]'),
('bramblefarm',4,'medium',1292,7,'["sink-2"]'),
('ironvale',5,'medium',1320,7,'["sink-4"]'),
('blackthorn',6,'medium',1368,8,'["sink-5"]'),
('alder',7,'medium',1394,7,'["sink-4"]'),
('neonarcade',3,'large',1584,7,'["sink-3"]'),
('mourningvale',1,'large',1840,7,'["sink-3"]'),
('crowmotel',8,'large',2100,10,'["sink-4"]'),
('blackbriarcircus',4,'large',2288,8,'["sink-3"]'),
('grayhaven',9,'large',2668,10,'["sink-5"]'),
('whispercamp',5,'large',2668,10,'["sink-5", "sink-6"]'),
('bellweather',10,'huge',3200,14,'["sink-3"]'),
('stbrigid',9,'huge',3672,14,'["sink-9"]'),
('lockridge',11,'huge',4712,14,'["sink-7"]'),
('ravenhill',12,'huge',5740,26,'["sink-8", "sink-18"]')
on conflict(id) do update set min_level=excluded.min_level,size=excluded.size,area=excluded.area,room_count=excluded.room_count,sink_ids=excluded.sink_ids;


create or replace function haunt_private.room_view(room uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();r haunt_private.rooms;people jsonb;supply jsonb;
begin
 select * into r from haunt_private.rooms where id=room and expires_at>now();
 if r.next_room is not null and exists(select 1 from haunt_private.members where room_id=r.next_room and user_id=uid and active) then return haunt_private.room_view(r.next_room);end if;
 if r.id is null or not exists(select 1 from haunt_private.members where room_id=room and user_id=uid and active) then raise exception 'HAUNT_ROOM' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(l.name,'Investigator'),'image',l.avimg,'ready',m.ready,'online',m.last_seen>now()-interval '25 seconds') order by case when m.user_id=r.host_id then 0 else 1 end,m.user_id),'[]') into people from haunt_private.members m left join public.leaderboard l on l.user_id=m.user_id where m.room_id=room and m.active;
 if r.phase='lobby' then
  select jsonb_object_agg(c.id,1+coalesce(x.n,0)) into supply from haunt_private.gear_catalog c left join
   (select e.key k,sum((e.value#>>'{}')::integer)::integer n from haunt_private.members m join haunt_private.gear_stashes s on s.user_id=m.user_id cross join lateral jsonb_each(s.selected)e where m.room_id=room and m.active group by e.key)x on x.k=c.id;
 else supply:=r.supplies;end if;
 return jsonb_build_object('id',r.id,'protocol',r.protocol,'code',r.code,'hostId',r.host_id,'phase',r.phase,'mapId',r.map_id,'difficulty',r.difficulty,'bots',r.bots,'botCount',case when r.protocol in (3,4,5) then r.bot_count else case when r.bots then 3 else 0 end end,'members',people,'seed',case when uid=r.host_id then r.seed end,'snapshot',r.snapshot,'roster',r.roster,'supplies',supply,'challenges',r.challenges,'garage',r.garage,'hostLevel',haunt_private.level(r.host_id),'inputs',case when uid=r.host_id then coalesce((select jsonb_object_agg(m.user_id::text,m.input) from haunt_private.members m where m.room_id=room and m.active),'{}') else '{}' end);
end $$;

revoke all on function haunt_private.room_view(uuid) from public,anon,authenticated;

create or replace function haunt_private.invitation_command(action text,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();r haunt_private.rooms;i haunt_private.invitations;target uuid;
begin
 if action='invitations' then return haunt_private.invite_view(uid);end if;
 if action='friends' then return coalesce((select jsonb_agg(to_jsonb(x) order by x.online desc,x.name) from(select f.friend_id id,l.name,l.avimg image,exists(select 1 from zone_hub_private.presence where user_id=f.friend_id and expires_at>now()) online,exists(select 1 from public.zh_library where user_id=f.friend_id and game_id='zone-haunt') owns from public.friends f join public.friends back on back.user_id=f.friend_id and back.friend_id=uid join public.leaderboard l on l.user_id=f.friend_id where f.user_id=uid)x),'[]');end if;
 perform pg_catalog.pg_advisory_xact_lock(28003421);
 if action='invite' then
  select * into r from haunt_private.rooms where id=(args->>'room')::uuid and phase='lobby' and protocol=3 and expires_at>now() for update;
  if r.id is null or not exists(select 1 from haunt_private.members where room_id=r.id and user_id=uid and active) then raise exception 'HAUNT_ROOM' using errcode='42501';end if;
  target:=(args->>'id')::uuid;if target is null or target=uid or not exists(select 1 from public.friends where user_id=uid and friend_id=target) or not exists(select 1 from public.friends where user_id=target and friend_id=uid) then raise exception 'HAUNT_FRIEND' using errcode='42501';end if;
  if not exists(select 1 from public.zh_library where user_id=target and game_id='zone-haunt') then raise exception 'HAUNT_FRIEND_LIBRARY';end if;
  if (select count(*) from haunt_private.invitations where sender_id=uid and created_at>now()-interval '1 minute')>=10 then raise exception 'HAUNT_RATE';end if;
  update haunt_private.invitations set status='expired' where room_id=r.id and recipient_id=target and status='pending' and expires_at<=now();
  insert into haunt_private.invitations(room_id,sender_id,recipient_id) values(r.id,uid,target) on conflict(room_id,recipient_id) where status='pending' do nothing;
  return '{}';
 end if;
 select * into i from haunt_private.invitations where id=(args->>'id')::uuid and recipient_id=uid for update;
 if i.id is null then raise exception 'HAUNT_INVITE' using errcode='42501';end if;
 if action='decline_invite' then if i.status='pending' then update haunt_private.invitations set status='declined' where id=i.id;end if;return '{}';end if;
 if action<>'accept_invite' or i.status not in ('pending','accepted') or i.expires_at<=now() then raise exception 'HAUNT_INVITE';end if;
 select * into r from haunt_private.rooms where id=i.room_id and phase='lobby' and protocol in (3,4,5) and expires_at>now() for update;if r.id is null then raise exception 'HAUNT_ROOM';end if;
 if not exists(select 1 from public.zh_library where user_id=uid and game_id='zone-haunt') then raise exception 'HUB_LIBRARY';end if;
 if exists(select 1 from haunt_private.members m join haunt_private.rooms q on q.id=m.room_id where m.user_id=uid and m.active and q.id<>r.id and q.phase in ('lobby','running') and q.expires_at>now()) then raise exception 'HAUNT_ALREADY';end if;
 if not exists(select 1 from haunt_private.members where room_id=r.id and user_id=uid and active) and (select count(*) from haunt_private.members where room_id=r.id and active)>=4 then raise exception 'HAUNT_FULL';end if;
 perform haunt_private.ensure_gear(uid);insert into haunt_private.members(room_id,user_id) values(r.id,uid) on conflict(room_id,user_id) do update set active=true,ready=false,last_seen=now(),input='{}';update haunt_private.invitations set status='accepted' where id=i.id;return haunt_private.room_view(r.id);
end $$;

revoke all on function haunt_private.invitation_command(text,jsonb) from public,anon,authenticated;

create or replace function haunt_private.expedition_invitation_command(action text,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();r haunt_private.rooms;i haunt_private.invitations;target uuid;
begin
 if action='invitations' then return haunt_private.invite_view(uid);end if;
 if action='friends' then return coalesce((select jsonb_agg(to_jsonb(x) order by x.online desc,x.name) from(select f.friend_id id,l.name,l.avimg image,exists(select 1 from zone_hub_private.presence where user_id=f.friend_id and expires_at>now()) online,exists(select 1 from public.zh_library where user_id=f.friend_id and game_id='zone-haunt') owns from public.friends f join public.friends back on back.user_id=f.friend_id and back.friend_id=uid join public.leaderboard l on l.user_id=f.friend_id where f.user_id=uid)x),'[]');end if;
 perform pg_catalog.pg_advisory_xact_lock(28003421);
 if action='invite' then
  select * into r from haunt_private.rooms where id=(args->>'room')::uuid and phase='lobby' and protocol=5 and expires_at>now() for update;
  if r.id is null or not exists(select 1 from haunt_private.members where room_id=r.id and user_id=uid and active) then raise exception 'HAUNT_ROOM' using errcode='42501';end if;
  target:=(args->>'id')::uuid;if target is null or target=uid or not exists(select 1 from public.friends where user_id=uid and friend_id=target) or not exists(select 1 from public.friends where user_id=target and friend_id=uid) then raise exception 'HAUNT_FRIEND' using errcode='42501';end if;
  if not exists(select 1 from public.zh_library where user_id=target and game_id='zone-haunt') then raise exception 'HAUNT_FRIEND_LIBRARY';end if;
  if (select count(*) from haunt_private.invitations where sender_id=uid and created_at>now()-interval '1 minute')>=10 then raise exception 'HAUNT_RATE';end if;
  update haunt_private.invitations set status='expired' where room_id=r.id and recipient_id=target and status='pending' and expires_at<=now();
  insert into haunt_private.invitations(room_id,sender_id,recipient_id) values(r.id,uid,target) on conflict(room_id,recipient_id) where status='pending' do nothing;
  return '{}';
 end if;
 select * into i from haunt_private.invitations where id=(args->>'id')::uuid and recipient_id=uid for update;
 if i.id is null then raise exception 'HAUNT_INVITE' using errcode='42501';end if;
 if action='decline_invite' then if i.status='pending' then update haunt_private.invitations set status='declined' where id=i.id;end if;return '{}';end if;
 if action<>'accept_invite' or i.status not in ('pending','accepted') or i.expires_at<=now() then raise exception 'HAUNT_INVITE';end if;
 select * into r from haunt_private.rooms where id=i.room_id and phase='lobby' and protocol=5 and expires_at>now() for update;if r.id is null then raise exception 'HAUNT_ROOM';end if;
 if not exists(select 1 from public.zh_library where user_id=uid and game_id='zone-haunt') then raise exception 'HUB_LIBRARY';end if;
 if exists(select 1 from haunt_private.members m join haunt_private.rooms q on q.id=m.room_id where m.user_id=uid and m.active and q.id<>r.id and q.phase in ('lobby','running') and q.expires_at>now()) then raise exception 'HAUNT_ALREADY';end if;
 if not exists(select 1 from haunt_private.members where room_id=r.id and user_id=uid and active) and (select count(*) from haunt_private.members where room_id=r.id and active)>=4 then raise exception 'HAUNT_FULL';end if;
 perform haunt_private.ensure_gear(uid);insert into haunt_private.members(room_id,user_id) values(r.id,uid) on conflict(room_id,user_id) do update set active=true,ready=false,last_seen=now(),input='{}';update haunt_private.invitations set status='accepted' where id=i.id;return haunt_private.room_view(r.id);
end $$;

revoke all on function haunt_private.expedition_invitation_command(text,jsonb) from public,anon,authenticated;

create or replace function haunt_private.legacy_fieldwork_finish(r haunt_private.rooms,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();guess text:=args->>'guess';correct boolean;ev integer;xp integer;money integer;bonus integer:=0;survived boolean;wipe boolean;person jsonb;scale numeric;size_factor numeric;kind text;challenge_bonus integer:=0;rate integer:=0;ghosts text[]:=array['wisp','lament','cinder','watcher','veil','morrow','echo','thorn','hollow','rattle','mourner','drifter','pulse','deceiver'];
begin
 if uid<>r.host_id then raise exception 'HAUNT_HOST' using errcode='42501';end if;if r.phase='complete' then return haunt_private.room_view(r.id);end if;
 if r.phase<>'running' or r.started_at>now()-interval '30 seconds' or r.snapshot->>'phase' is distinct from 'complete' or coalesce((r.snapshot->>'time')::numeric,0)<30 then raise exception 'HAUNT_EARLY';end if;
 correct:=coalesce(guess=ghosts[1+r.seed%14],false);ev:=least(3,jsonb_array_length(coalesce(r.snapshot->'found','[]')));wipe:=not exists(select 1 from jsonb_array_elements(r.snapshot->'players') p where p->>'alive'='true');
 select size into kind from haunt_private.map_catalog where id=r.map_id;size_factor:=case kind when 'medium' then 1.15 when 'large' then 1.35 when 'huge' then 1.6 else 1 end;scale:=size_factor*case r.difficulty when 'normal' then 1.25 when 'nightmare' then 1.6 else 1 end;
 select least(115,50*least(1,count(*) filter(where p->>'kind'='ghost'))+25*least(1,count(*) filter(where p->>'kind'='bone'))+20*least(2,count(*) filter(where p->>'kind'='uv')))::integer into bonus from(select distinct on (p->>'target') p from jsonb_array_elements(coalesce(r.snapshot->'photos','[]')) p where (p->>'kind'='ghost' and p->>'target'='ghost') or (p->>'kind'='bone' and p->>'target'='bone') or (p->>'kind'='uv' and p->>'target'~'^trace-[0-9]{1,7}$'))x;
 if r.snapshot->'bone'->>'collected'='true' then bonus:=bonus+25;end if;
 xp:=case when wipe then least(30,ev*5) else round((case when correct then 120+ev*30+(case when r.snapshot->'objectives'->>'hunt'='true' then 25 else 0 end)+(case when r.snapshot->'objectives'->>'photo'='true' then 25 else 0 end) else ev*10 end)*size_factor)::integer end;
 money:=case when wipe then 0 else least(900,round(((case when correct then 90 else 0 end)+ev*10+least(140,bonus))*scale)::integer) end;

 if r.protocol=4 and correct and not wipe and (r.snapshot->>'time')::numeric>=30 then
  rate:=haunt_private.challenge_percent(r.challenges);challenge_bonus:=round(money*rate/100.0)::integer;
 end if;
 money:=money+challenge_bonus;
 -- The server recalculates the amount. The host's displayed price is never used as a credit.
 update haunt_private.rooms set snapshot=jsonb_set(jsonb_set(jsonb_set(snapshot,'{result,money}',to_jsonb(money)),'{result,challengeBonus}',to_jsonb(challenge_bonus)),'{result,baseMoney}',to_jsonb(money-challenge_bonus)) where id=r.id;
 for person in select value from jsonb_array_elements(r.roster) loop
  survived:=exists(select 1 from jsonb_array_elements(r.snapshot->'players') p where p->>'id'=person->>'id' and p->>'alive'='true');
  insert into haunt_private.results(room_id,user_id,correct,survived,evidence,xp,money,challenge_bonus) values(r.id,(person->>'id')::uuid,correct,survived,ev,xp,money,challenge_bonus) on conflict do nothing;
 end loop;
 perform haunt_private.settle_gear(r.id,wipe);update haunt_private.rooms set phase='complete',updated_at=now() where id=r.id;return haunt_private.room_view(r.id);
end $$;

revoke all on function haunt_private.legacy_fieldwork_finish(haunt_private.rooms,jsonb) from public,anon,authenticated;

create or replace function haunt_private.expedition_finish(r haunt_private.rooms,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();guess text:=args->>'guess';correct boolean;ev integer;xp integer;money integer;bonus integer:=0;survived boolean;wipe boolean;person jsonb;scale numeric;size_factor numeric;kind text;challenge_bonus integer:=0;rate integer:=0;ghosts text[]:=array['wisp','lament','cinder','watcher','veil','morrow','echo','thorn','hollow','rattle','mourner','drifter','pulse','deceiver','demon'];
begin
 if uid<>r.host_id then raise exception 'HAUNT_HOST' using errcode='42501';end if;if r.phase='complete' then return haunt_private.room_view(r.id);end if;
 if r.phase<>'running' or r.started_at>now()-interval '30 seconds' or r.snapshot->>'phase' is distinct from 'complete' or coalesce((r.snapshot->>'time')::numeric,0)<30 then raise exception 'HAUNT_EARLY';end if;
 correct:=coalesce(guess=ghosts[1+r.seed%15],false);ev:=least(3,jsonb_array_length(coalesce(r.snapshot->'found','[]')));wipe:=not exists(select 1 from jsonb_array_elements(r.snapshot->'players') p where p->>'alive'='true');
 select size into kind from haunt_private.map_catalog where id=r.map_id;size_factor:=case kind when 'medium' then 1.15 when 'large' then 1.35 when 'huge' then 1.6 else 1 end;scale:=size_factor*case r.difficulty when 'normal' then 1.25 when 'nightmare' then 1.6 else 1 end;
 select least(235,
  50*least(1,count(*) filter(where p->>'kind'='ghost'))+
  25*least(1,count(*) filter(where p->>'kind'='bone'))+
  20*least(2,count(*) filter(where p->>'kind'='uv'))+
  35*least(2,count(*) filter(where p->>'kind'='water'))+
  25*least(2,count(*) filter(where p->>'kind'='salt')))::integer into bonus
 from(select distinct on(p->>'target') p from jsonb_array_elements(coalesce(r.snapshot->'photos','[]')) p where
  (p->>'kind'='ghost' and p->>'target'='ghost') or
  (p->>'kind'='bone' and p->>'target'='bone') or
  (p->>'kind'='uv' and p->>'target'~'^trace-[0-9]{1,7}$') or
  (p->>'kind'='water' and exists(select 1 from jsonb_array_elements(coalesce(r.snapshot->'sinks','[]'))s where s->>'id'=p->>'target' and s->>'dirty'='true')) or
  (p->>'kind'='salt' and exists(select 1 from jsonb_array_elements(coalesce(r.snapshot->'devices','[]'))d where d->>'id'=p->>'target' and d->>'kind'='salt' and d->>'disturbed'='true'))
 )x;
 if r.snapshot->'bone'->>'collected'='true' then bonus:=bonus+25;end if;
 xp:=case when wipe then least(30,ev*5) else round((case when correct then 120+ev*30+(case when r.snapshot->'objectives'->>'hunt'='true' then 25 else 0 end)+(case when r.snapshot->'objectives'->>'photo'='true' then 25 else 0 end) else ev*10 end)*size_factor)::integer end;
 money:=case when wipe then 0 else least(1200,round(((case when correct then 90 else 0 end)+ev*10+least(260,bonus))*scale)::integer) end;

 if r.protocol=5 and correct and not wipe and (r.snapshot->>'time')::numeric>=30 then
  rate:=haunt_private.challenge_percent(r.challenges);challenge_bonus:=round(money*rate/100.0)::integer;
 end if;
 money:=money+challenge_bonus;
 -- The server recalculates the amount. The host's displayed price is never used as a credit.
 update haunt_private.rooms set snapshot=jsonb_set(jsonb_set(jsonb_set(snapshot,'{result,money}',to_jsonb(money)),'{result,challengeBonus}',to_jsonb(challenge_bonus)),'{result,baseMoney}',to_jsonb(money-challenge_bonus)) where id=r.id;
 for person in select value from jsonb_array_elements(r.roster) loop
  survived:=exists(select 1 from jsonb_array_elements(r.snapshot->'players') p where p->>'id'=person->>'id' and p->>'alive'='true');
  insert into haunt_private.results(room_id,user_id,correct,survived,evidence,xp,money,challenge_bonus) values(r.id,(person->>'id')::uuid,correct,survived,ev,xp,money,challenge_bonus) on conflict do nothing;
 end loop;
 perform haunt_private.settle_gear(r.id,wipe);update haunt_private.rooms set phase='complete',updated_at=now() where id=r.id;return haunt_private.room_view(r.id);
end $$;

revoke all on function haunt_private.expedition_finish(haunt_private.rooms,jsonb) from public,anon,authenticated;

create or replace function haunt_private.finish_contract(r haunt_private.rooms,args jsonb) returns jsonb language sql security invoker set search_path='' as $$ select case when r.protocol=5 then haunt_private.expedition_finish(r,args) else haunt_private.legacy_fieldwork_finish(r,args) end $$;
revoke all on function haunt_private.finish_contract(haunt_private.rooms,jsonb) from public,anon,authenticated;

create or replace function haunt_private.expedition_command(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();r haunt_private.rooms;room uuid;vcode text;slot integer;doc jsonb;pool jsonb;n integer;required integer;expected text[];seen text[];head jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HAUNT_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>70000 then raise exception 'HAUNT_INPUT';end if;
 if action in ('friends','invite','invitations','accept_invite','decline_invite') then return haunt_private.expedition_invitation_command(action,args);end if;
 if action in ('gear_state','gear_buy','gear_select') then return haunt_private.gear_command(action,args);end if;
 if action='home' then
  head:=haunt_private.lobby_command('home','{}');select m.room_id into room from haunt_private.members m join haunt_private.rooms q on q.id=m.room_id where m.user_id=uid and m.active and q.protocol=5 and q.phase in ('lobby','running','complete') and q.expires_at>now() order by m.last_seen desc limit 1;
  if room is not null then head:=head||jsonb_build_object('room',haunt_private.room_view(room));end if;
  if args->>'protocol'='5' and exists(select 1 from public.zh_library where user_id=uid and game_id='zone-haunt') then head:=head||jsonb_build_object('gear',haunt_private.gear_view(uid),'level',haunt_private.level(uid),'invitations',haunt_private.invite_view(uid));end if;return head;
 end if;
 if action in ('create','join') and args->>'protocol'='5' then
  if not exists(select 1 from public.zh_library where user_id=uid and game_id='zone-haunt') then raise exception 'HUB_LIBRARY';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,934));perform haunt_private.ensure_gear(uid);
  if action='create' then
   if (select count(*) from haunt_private.rooms where host_id=uid and created_at>now()-interval '10 minutes')>=10 then raise exception 'HAUNT_RATE';end if;
   if exists(select 1 from haunt_private.members m join haunt_private.rooms q on q.id=m.room_id where m.user_id=uid and m.active and q.phase in ('lobby','running') and q.expires_at>now()) then raise exception 'HAUNT_ALREADY';end if;
   for slot in 1..4 loop vcode:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));begin insert into haunt_private.rooms(code,host_id,protocol,map_id,seed) values(vcode,uid,5,'willow',1+floor(random()*2147483645)::integer) returning id into room;exit;exception when unique_violation then if slot=4 then raise;end if;end;end loop;
   insert into haunt_private.members(room_id,user_id,ready) values(room,uid,true);return haunt_private.room_view(room);
  else
   vcode:=upper(btrim(args->>'code'));if vcode is null or vcode!~'^[A-F0-9]{6}$' then raise exception 'HAUNT_CODE';end if;
   select * into r from haunt_private.rooms where code=vcode and expires_at>now() for update;if r.id is null then raise exception 'HAUNT_ROOM';end if;if r.protocol<>5 then raise exception 'HAUNT_VERSION';end if;
   if exists(select 1 from haunt_private.members where room_id=r.id and user_id=uid and active) then update haunt_private.members set last_seen=now() where room_id=r.id and user_id=uid;return haunt_private.room_view(r.id);end if;
   if r.phase<>'lobby' then raise exception 'HAUNT_STARTED';end if;
   if exists(select 1 from haunt_private.members m join haunt_private.rooms q on q.id=m.room_id where m.user_id=uid and m.active and q.phase in ('lobby','running') and q.expires_at>now()) then raise exception 'HAUNT_ALREADY';end if;
   if (select count(*) from haunt_private.members where room_id=r.id and active)>=4 then raise exception 'HAUNT_FULL';end if;
   insert into haunt_private.members(room_id,user_id) values(r.id,uid) on conflict(room_id,user_id) do update set active=true,ready=false,last_seen=now(),input='{}';return haunt_private.room_view(r.id);
  end if;
 end if;
 if action in ('create','join') then return haunt_private.fieldwork_command(action,args);end if;
 if action in ('start','finish','gear_buy','gear_select','leave') then perform zone_wallet_private.lock();end if;
 if coalesce(args->>'room','')!~'^[a-f0-9-]{36}$' then raise exception 'HAUNT_ROOM';end if;room:=(args->>'room')::uuid;
 select * into r from haunt_private.rooms where id=room and expires_at>now() for update;
 if r.next_room is not null and exists(select 1 from haunt_private.members where room_id=r.next_room and user_id=uid and active) then return haunt_private.room_view(r.next_room);end if;
 if r.id is null or not exists(select 1 from haunt_private.members where room_id=room and user_id=uid and active) then raise exception 'HAUNT_ROOM' using errcode='42501';end if;
 if r.protocol<>5 then return haunt_private.fieldwork_command(action,args);end if;
 update haunt_private.members set last_seen=now() where room_id=room and user_id=uid;update haunt_private.rooms set expires_at=now()+interval '30 minutes' where id=room;
 if action='leave' then if r.host_id=uid then update haunt_private.rooms set phase='closed',updated_at=now() where id=room;end if;update haunt_private.members set active=false,ready=false,input='{}' where room_id=room and user_id=uid;return '{}';
 elsif action='configure' then
  if r.host_id<>uid or r.phase<>'lobby' then raise exception 'HAUNT_HOST' using errcode='42501';end if;
  select min_level into required from haunt_private.map_catalog where id=args->>'mapId';if required is null or coalesce(args->>'difficulty','') not in ('calm','normal','nightmare') or coalesce(args->>'botCount','')!~'^[0-3]$' or not haunt_private.valid_challenges(coalesce(args->'challenges','[]')) then raise exception 'HAUNT_INPUT';end if;
  if haunt_private.level(uid)<required then raise exception 'HAUNT_MAP_LOCKED';end if;
  update haunt_private.rooms set challenges=(select coalesce(jsonb_agg(c.id order by c.ord),'[]') from unnest(array['no_flashlight','no_power','hard_evidence','roaming','frequent_hunts','no_sanity','no_activity']) with ordinality c(id,ord) where coalesce(args->'challenges','[]') ? c.id),map_id=args->>'mapId',difficulty=args->>'difficulty',bot_count=(args->>'botCount')::integer,bots=(args->>'botCount')::integer>0,updated_at=now() where id=room;update haunt_private.members set ready=(user_id=r.host_id) where room_id=room and active;
 elsif action='ready' then
  if r.phase<>'lobby' or jsonb_typeof(args->'ready') is distinct from 'boolean' then raise exception 'HAUNT_INPUT';end if;update haunt_private.members set ready=(args->>'ready')::boolean where room_id=room and user_id=uid;
 elsif action='start' then
  if r.host_id<>uid or r.phase<>'lobby' then raise exception 'HAUNT_HOST' using errcode='42501';end if;
  if exists(select 1 from haunt_private.members where room_id=room and active and (not ready or last_seen<now()-interval '25 seconds')) then raise exception 'HAUNT_NOT_READY';end if;
  if haunt_private.level(uid)<(select min_level from haunt_private.map_catalog where id=r.map_id) then raise exception 'HAUNT_MAP_LOCKED';end if;
  doc:=haunt_private.room_view(room);pool:=haunt_private.prepare_gear(r);update haunt_private.rooms set phase='running',roster=doc->'members',supplies=pool,started_at=now(),updated_at=now(),garage=null where id=room;
 elsif action='return_lobby' then
  if r.host_id<>uid or r.phase<>'complete' then raise exception 'HAUNT_HOST' using errcode='42501';end if;
  -- A completed expedition is immutable; create a fresh contract row and transfer the crew.
  for slot in 1..4 loop vcode:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));begin insert into haunt_private.rooms(code,host_id,protocol,map_id,difficulty,bots,bot_count,challenges,seed) values(vcode,uid,5,r.map_id,r.difficulty,r.bots,r.bot_count,r.challenges,1+floor(random()*2147483645)::integer) returning id into room;exit;exception when unique_violation then if slot=4 then raise;end if;end;end loop;
  insert into haunt_private.members(room_id,user_id,ready) select room,user_id,user_id=uid from haunt_private.members where room_id=r.id and active;update haunt_private.members set active=false where room_id=r.id;update haunt_private.rooms set next_room=room where id=r.id;
  return haunt_private.room_view(room);
 elsif action='finish' then return haunt_private.finish_contract(r,args);
 elsif action='sync' then
  if args ? 'input' then if jsonb_typeof(args->'input') is distinct from 'object' or octet_length((args->'input')::text)>2048 then raise exception 'HAUNT_INPUT';end if;update haunt_private.members set input=args->'input' where room_id=room and user_id=uid;end if;
  if args ? 'garage' then
   doc:=args->'garage';if uid<>r.host_id or r.phase<>'lobby' then raise exception 'HAUNT_HOST' using errcode='42501';end if;
   if jsonb_typeof(doc) is distinct from 'object' or doc->>'kind'<>'haunt-garage' or octet_length(doc::text)>12000 or jsonb_typeof(doc->'players') is distinct from 'array' or jsonb_array_length(doc->'players')>4 then raise exception 'HAUNT_INPUT';end if;update haunt_private.rooms set garage=doc,updated_at=now() where id=room;
  end if;
  if args ? 'snapshot' then
   if uid<>r.host_id or r.phase<>'running' then raise exception 'HAUNT_HOST' using errcode='42501';end if;doc:=args->'snapshot';n:=jsonb_array_length(r.roster);
   select array_agg(id order by id) into expected from(select p->>'id' id from jsonb_array_elements(r.roster)p union all select 'bot-'||i from generate_series(n,n+least(r.bot_count,4-n)-1)i)x;
   select array_agg(p->>'id' order by p->>'id') into seen from jsonb_array_elements(coalesce(doc->'players','[]'))p;
   if jsonb_typeof(doc) is distinct from 'object' or doc->>'schema'<>'5' or doc->>'id'<>room::text or doc->>'mapId'<>r.map_id or doc->'challenges' is distinct from r.challenges or doc->>'difficulty' is distinct from r.difficulty or jsonb_typeof(doc->'players') is distinct from 'array' or seen is distinct from expected or coalesce(doc->>'phase','') not in ('investigating','complete') or jsonb_typeof(doc->'time')<>'number' or (doc->>'time')::numeric<0 or (doc->>'time')::numeric>1600 or jsonb_array_length(coalesce(doc->'found','[]'))>4 or jsonb_array_length(coalesce(doc->'devices','[]'))>48 or jsonb_array_length(coalesce(doc->'photos','[]'))>8 then raise exception 'HAUNT_INPUT';end if;
   if doc->'focusRoom' is not null and doc->'focusRoom'<>'null'::jsonb and (jsonb_typeof(doc->'focusRoom')<>'object' or coalesce(doc->'focusRoom'->>'id','')!~'^[0-9]{1,2}$') then raise exception 'HAUNT_INPUT';end if;
   if doc->'focusRoom'->>'id' is not null and (doc->'focusRoom'->>'id')::integer>=(select room_count from haunt_private.map_catalog where id=r.map_id) then raise exception 'HAUNT_INPUT';end if;
   if jsonb_typeof(doc->'sinks') is distinct from 'array' or jsonb_array_length(doc->'sinks')>16 or exists(select 1 from jsonb_array_elements(doc->'sinks')s where coalesce(s->>'id','')!~'^sink-[0-9]{1,3}$' or jsonb_typeof(s->'dirty') is distinct from 'boolean' or jsonb_typeof(s->'on') is distinct from 'boolean' or not (select sink_ids ? (s->>'id') from haunt_private.map_catalog where id=r.map_id)) then raise exception 'HAUNT_INPUT';end if;
   if exists(select 1 from jsonb_array_elements(doc->'players')p where jsonb_typeof(p->'alive') is distinct from 'boolean') then raise exception 'HAUNT_INPUT';end if;
   if r.challenges ? 'no_power' and (doc->>'power' is distinct from 'false' or doc->>'lights' is distinct from 'false') then raise exception 'HAUNT_INPUT';end if;
   if r.challenges ? 'no_flashlight' and exists(select 1 from jsonb_array_elements(doc->'players')p where p->>'flashlight'='true') then raise exception 'HAUNT_INPUT';end if;
   if coalesce((r.snapshot->>'time')::numeric,0)<=(doc->>'time')::numeric then update haunt_private.rooms set snapshot=doc,updated_at=now() where id=room;end if;
  end if;
 else raise exception 'HAUNT_ACTION';end if;
 return haunt_private.room_view(room);
end $$;

revoke all on function haunt_private.expedition_command(text,jsonb) from public,anon;
grant execute on function haunt_private.expedition_command(text,jsonb) to authenticated;
create or replace function public.zone_haunt(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select case when args->>'protocol'='5' then haunt_private.expedition_command(action,args) when args->>'protocol'='4' then haunt_private.fieldwork_command(action,args) else haunt_private.progression_command(action,args) end $$;
revoke all on function public.zone_haunt(text,jsonb) from public,anon;
grant execute on function public.zone_haunt(text,jsonb) to authenticated;
notify pgrst,'reload schema';
