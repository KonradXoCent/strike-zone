-- Zone Haunt protocol 3: owned equipment, map progression and friend invitations.
-- Apply after zone-haunt.sql and zone-wallet.sql. Legacy protocol 1/2 stays readable.
create table if not exists haunt_private.map_catalog(id text primary key,min_level integer not null check(min_level between 1 and 100),size text not null check(size in ('small','medium','large','huge')),area integer not null);
create table if not exists haunt_private.gear_catalog(id text primary key,price integer not null check(price between 1 and 10000));
create table if not exists haunt_private.gear_stashes(user_id uuid primary key references auth.users(id) on delete cascade,items jsonb not null default '{}',selected jsonb not null default '{}',updated_at timestamptz not null default now());
create table if not exists haunt_private.gear_orders(id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,tool text not null references haunt_private.gear_catalog(id),quantity integer not null check(quantity between 1 and 4),price integer not null,created_at timestamptz not null default now());
create index if not exists haunt_gear_orders_user on haunt_private.gear_orders(user_id,created_at desc);
create table if not exists haunt_private.deployments(room_id uuid not null references haunt_private.rooms(id) on delete cascade,user_id uuid not null references auth.users(id),items jsonb not null,settled boolean not null default false,wiped boolean not null default false,primary key(room_id,user_id));
create index if not exists haunt_deployments_user on haunt_private.deployments(user_id,room_id);
create table if not exists haunt_private.invitations(id uuid primary key default gen_random_uuid(),room_id uuid not null references haunt_private.rooms(id) on delete cascade,sender_id uuid not null references auth.users(id),recipient_id uuid not null references auth.users(id),status text not null default 'pending' check(status in ('pending','accepted','declined','expired')),created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '10 minutes',check(sender_id<>recipient_id));
create unique index if not exists haunt_invite_pending on haunt_private.invitations(room_id,recipient_id) where status='pending';
create index if not exists haunt_invite_inbox on haunt_private.invitations(recipient_id,expires_at) where status='pending';
create index if not exists haunt_invite_sender on haunt_private.invitations(sender_id,created_at desc);
alter table haunt_private.map_catalog enable row level security;
alter table haunt_private.gear_catalog enable row level security;
alter table haunt_private.gear_stashes enable row level security;
alter table haunt_private.gear_orders enable row level security;
alter table haunt_private.deployments enable row level security;
alter table haunt_private.invitations enable row level security;
revoke all on haunt_private.map_catalog,haunt_private.gear_catalog,haunt_private.gear_stashes,haunt_private.gear_orders,haunt_private.deployments,haunt_private.invitations from public,anon,authenticated;
insert into haunt_private.gear_catalog values('flashlight',60),('emf',90),('thermo',80),('uv',110),('spirit',140),('book',90),('camera',200),('dots',180),('crucifix',180),('salt',35),('recorder',160),('photo',150) on conflict(id) do update set price=excluded.price;
-- MAP CATALOG START
insert into haunt_private.map_catalog(id,min_level,size,area) values
('willow',1,'small',576),
('harvest',1,'small',896),
('pinewood',2,'small',1020),
('marshchapel',3,'small',1088),
('bramblefarm',4,'medium',1292),
('ironvale',5,'medium',1320),
('blackthorn',6,'medium',1368),
('alder',7,'medium',1394),
('crowmotel',8,'large',2100),
('grayhaven',9,'large',2668),
('bellweather',10,'huge',3200),
('ravenhill',12,'huge',5740)
on conflict(id) do update set min_level=excluded.min_level,size=excluded.size,area=excluded.area;
-- MAP CATALOG END
alter table haunt_private.rooms drop constraint if exists rooms_map_id_check;
do $$ declare c record;begin for c in select conname from pg_constraint where conrelid='haunt_private.rooms'::regclass and contype='c' and pg_get_constraintdef(oid) like '%protocol%' loop execute format('alter table haunt_private.rooms drop constraint %I',c.conname);end loop;end $$;
alter table haunt_private.rooms add constraint rooms_protocol_check check(protocol in (1,2,3));
alter table haunt_private.rooms add column if not exists bot_count integer not null default 3 check(bot_count between 0 and 3);
alter table haunt_private.rooms add column if not exists supplies jsonb not null default '{}';
alter table haunt_private.rooms add column if not exists garage jsonb;
alter table haunt_private.rooms add column if not exists next_room uuid references haunt_private.rooms(id);
create index if not exists haunt_room_next on haunt_private.rooms(next_room);
create index if not exists haunt_invite_room on haunt_private.invitations(room_id);
create index if not exists haunt_invite_recipient on haunt_private.invitations(recipient_id,created_at desc);
alter table public.zh_games add column if not exists price_zc integer not null default 0 check(price_zc between 0 and 10000000);

create or replace function haunt_private.level(target uuid) returns integer language sql stable security definer set search_path='' as $$ select 1+(coalesce(sum(xp),0)/250)::integer from haunt_private.results where user_id=target $$;
revoke all on function haunt_private.level(uuid) from public,anon,authenticated;
create or replace function haunt_private.ensure_gear(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin insert into haunt_private.gear_stashes(user_id,items,selected) values(target,'{"flashlight":1,"emf":1,"thermo":1,"book":1}','{"flashlight":1,"emf":1,"thermo":1,"book":1}') on conflict do nothing;end $$;
revoke all on function haunt_private.ensure_gear(uuid) from public,anon,authenticated;
create or replace function haunt_private.gear_view(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s haunt_private.gear_stashes;
begin perform haunt_private.ensure_gear(target);select * into s from haunt_private.gear_stashes where user_id=target;return jsonb_build_object('owned',s.items,'selected',s.selected,'prices',(select jsonb_object_agg(id,price) from haunt_private.gear_catalog));end $$;
revoke all on function haunt_private.gear_view(uuid) from public,anon,authenticated;
create or replace function haunt_private.invite_view(target uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') from(select i.id,i.room_id,i.sender_id,coalesce(l.name,'Investigator') sender_name,l.avimg sender_image,r.code,r.map_id,i.created_at,i.expires_at from haunt_private.invitations i join haunt_private.rooms r on r.id=i.room_id left join public.leaderboard l on l.user_id=i.sender_id where i.recipient_id=target and i.status='pending' and i.expires_at>now() and r.expires_at>now() and r.phase='lobby' order by i.created_at desc limit 20)x $$;
revoke all on function haunt_private.invite_view(uuid) from public,anon,authenticated;

create or replace function haunt_private.room_view(room uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();r haunt_private.rooms;people jsonb;supply jsonb;
begin
 select * into r from haunt_private.rooms where id=room and expires_at>now();
 if r.next_room is not null and exists(select 1 from haunt_private.members where room_id=r.next_room and user_id=uid and active) then return haunt_private.room_view(r.next_room);end if;
 if r.id is null or not exists(select 1 from haunt_private.members where room_id=room and user_id=uid and active) then raise exception 'HAUNT_ROOM' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(l.name,'Investigator'),'image',l.avimg,'ready',m.ready,'online',m.last_seen>now()-interval '25 seconds') order by case when m.user_id=r.host_id then 0 else 1 end,m.user_id),'[]') into people from haunt_private.members m left join public.leaderboard l on l.user_id=m.user_id where m.room_id=room and m.active;
 if r.phase='lobby' then select coalesce(jsonb_object_agg(k,n),'{}') into supply from(select e.key k,sum((e.value#>>'{}')::integer)::integer n from haunt_private.members m join haunt_private.gear_stashes s on s.user_id=m.user_id cross join lateral jsonb_each(s.selected) e where m.room_id=room and m.active group by e.key)x;else supply:=r.supplies;end if;
 return jsonb_build_object('id',r.id,'protocol',r.protocol,'code',r.code,'hostId',r.host_id,'phase',r.phase,'mapId',r.map_id,'difficulty',r.difficulty,'bots',r.bots,'botCount',case when r.protocol=3 then r.bot_count else case when r.bots then 3 else 0 end end,'members',people,'seed',case when uid=r.host_id then r.seed end,'snapshot',r.snapshot,'roster',r.roster,'supplies',supply,'garage',r.garage,'hostLevel',haunt_private.level(r.host_id),'inputs',case when uid=r.host_id then coalesce((select jsonb_object_agg(m.user_id::text,m.input) from haunt_private.members m where m.room_id=room and m.active),'{}') else '{}' end);
end $$;
revoke all on function haunt_private.room_view(uuid) from public,anon,authenticated;

create or replace function haunt_private.gear_command(action text,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();s haunt_private.gear_stashes;o haunt_private.gear_orders;tool text:=args->>'tool';quantity integer;price integer;request uuid;doc jsonb;choice jsonb;entry record;total integer:=0;deployed integer:=0;
begin
 if not exists(select 1 from public.zh_library where user_id=uid and game_id='zone-haunt') then raise exception 'HUB_LIBRARY';end if;
 perform zone_wallet_private.lock();perform zone_wallet_private.ensure(uid);perform haunt_private.ensure_gear(uid);
 if action='gear_state' then return jsonb_build_object('gear',haunt_private.gear_view(uid),'wallet',zone_wallet_private.view(uid));end if;
 if action='gear_buy' and coalesce(args->>'request','')~'^[a-f0-9-]{36}$' then select * into o from haunt_private.gear_orders where id=(args->>'request')::uuid;if found then if o.user_id<>uid or o.tool is distinct from tool or o.quantity::text is distinct from args->>'quantity' then raise exception 'HAUNT_GEAR_INPUT';end if;return jsonb_build_object('gear',haunt_private.gear_view(uid),'wallet',zone_wallet_private.view(uid));end if;end if;
 if exists(select 1 from haunt_private.members m join haunt_private.rooms r on r.id=m.room_id where m.user_id=uid and m.active and r.phase='running' and r.expires_at>now()) then raise exception 'HAUNT_GEAR_RUNNING';end if;
 select * into s from haunt_private.gear_stashes where user_id=uid for update;
 if action='gear_buy' then
  if coalesce(args->>'request','')!~'^[a-f0-9-]{36}$' or coalesce(args->>'quantity','')!~'^[1-4]$' then raise exception 'HAUNT_GEAR_INPUT';end if;request:=(args->>'request')::uuid;quantity:=(args->>'quantity')::integer;
  select * into o from haunt_private.gear_orders where id=request;if found then if o.user_id<>uid or o.tool<>tool or o.quantity<>quantity then raise exception 'HAUNT_GEAR_INPUT';end if;return jsonb_build_object('gear',haunt_private.gear_view(uid),'wallet',zone_wallet_private.view(uid));end if;
  select c.price into price from haunt_private.gear_catalog c where c.id=tool;if price is null then raise exception 'HAUNT_GEAR_INPUT';end if;
  select coalesce(sum((d.items->>tool)::integer),0)::integer into deployed from haunt_private.deployments d join haunt_private.rooms r on r.id=d.room_id where d.user_id=uid and not d.settled and r.phase='running' and r.expires_at>now();
  if coalesce((s.items->>tool)::integer,0)+deployed+quantity>8 then raise exception 'HAUNT_GEAR_CAP';end if;
  perform zone_wallet_private.change(uid,-price*quantity,'haunt_gear',request::text,'zone-haunt');
  s.items:=jsonb_set(s.items,array[tool],to_jsonb(coalesce((s.items->>tool)::integer,0)+quantity));if coalesce((s.selected->>tool)::integer,0)=0 and (select coalesce(sum((e.value#>>'{}')::integer),0) from jsonb_each(s.selected)e)<16 then s.selected:=jsonb_set(s.selected,array[tool],'1');end if;
  insert into haunt_private.gear_orders(id,user_id,tool,quantity,price) values(request,uid,tool,quantity,price*quantity);
  select json into doc from public.saves where user_id=uid for update;update public.saves set json=zone_wallet_private.project(doc,uid),updated_at=now() where user_id=uid;
 elsif action='gear_select' then
  choice:=args->'selected';if jsonb_typeof(choice) is distinct from 'object' or octet_length(choice::text)>3000 then raise exception 'HAUNT_GEAR_INPUT';end if;
  for entry in select key,value from jsonb_each(choice) loop if not exists(select 1 from haunt_private.gear_catalog where id=entry.key) or jsonb_typeof(entry.value)<>'number' or (entry.value#>>'{}')!~'^[0-2]$' or (entry.value#>>'{}')::integer>coalesce((s.items->>entry.key)::integer,0) then raise exception 'HAUNT_GEAR_INPUT';end if;total:=total+(entry.value#>>'{}')::integer;end loop;
  if total>16 then raise exception 'HAUNT_GEAR_CAP';end if;s.selected:=choice;
 else raise exception 'HAUNT_ACTION';end if;
 update haunt_private.gear_stashes set items=s.items,selected=s.selected,updated_at=now() where user_id=uid;
 update haunt_private.members m set ready=(m.user_id=r.host_id) from haunt_private.rooms r where m.room_id=r.id and m.user_id=uid and m.active and r.phase='lobby';
 return jsonb_build_object('gear',haunt_private.gear_view(uid),'wallet',zone_wallet_private.view(uid));
end $$;
revoke all on function haunt_private.gear_command(text,jsonb) from public,anon,authenticated;

create or replace function haunt_private.prepare_gear(r haunt_private.rooms) returns jsonb language plpgsql security definer set search_path='' as $$
declare person record;s haunt_private.gear_stashes;e record;pool jsonb:='{}';
begin
 for person in select user_id from haunt_private.members where room_id=r.id and active order by user_id loop
  perform haunt_private.ensure_gear(person.user_id);select * into s from haunt_private.gear_stashes where user_id=person.user_id for update;
  if exists(select 1 from haunt_private.deployments where room_id=r.id and user_id=person.user_id) then raise exception 'HAUNT_DEPLOYMENT';end if;
  for e in select key,value from jsonb_each(s.selected) loop if (e.value#>>'{}')::integer>coalesce((s.items->>e.key)::integer,0) then raise exception 'HAUNT_GEAR_CHANGED';end if;pool:=jsonb_set(pool,array[e.key],to_jsonb(coalesce((pool->>e.key)::integer,0)+(e.value#>>'{}')::integer));s.items:=jsonb_set(s.items,array[e.key],to_jsonb(coalesce((s.items->>e.key)::integer,0)-(e.value#>>'{}')::integer));end loop;
  insert into haunt_private.deployments(room_id,user_id,items) values(r.id,person.user_id,s.selected);update haunt_private.gear_stashes set items=s.items,selected='{}',updated_at=now() where user_id=person.user_id;
 end loop;return pool;
end $$;
revoke all on function haunt_private.prepare_gear(haunt_private.rooms) from public,anon,authenticated;
create or replace function haunt_private.settle_gear(room uuid,wipe boolean) returns void language plpgsql security definer set search_path='' as $$
declare d record;s haunt_private.gear_stashes;e record;
begin
 for d in select * from haunt_private.deployments where room_id=room and not settled order by user_id for update loop
  select * into s from haunt_private.gear_stashes where user_id=d.user_id for update;
  if not wipe then for e in select key,value from jsonb_each(d.items) loop s.items:=jsonb_set(s.items,array[e.key],to_jsonb(coalesce((s.items->>e.key)::integer,0)+(e.value#>>'{}')::integer));end loop;end if;
  update haunt_private.gear_stashes set items=s.items,selected=case when wipe then '{}'::jsonb else d.items end,updated_at=now() where user_id=d.user_id;
  update haunt_private.deployments set settled=true,wiped=wipe where room_id=room and user_id=d.user_id;
 end loop;
end $$;
revoke all on function haunt_private.settle_gear(uuid,boolean) from public,anon,authenticated;

create or replace function haunt_private.finish_contract(r haunt_private.rooms,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();guess text:=args->>'guess';correct boolean;ev integer;xp integer;money integer;bonus integer:=0;survived boolean;wipe boolean;person jsonb;scale numeric;size_factor numeric;kind text;ghosts text[]:=array['wisp','lament','cinder','watcher','veil','morrow','echo','thorn','hollow','rattle','mourner','drifter','pulse','deceiver'];
begin
 if uid<>r.host_id then raise exception 'HAUNT_HOST' using errcode='42501';end if;if r.phase='complete' then return haunt_private.room_view(r.id);end if;
 if r.phase<>'running' or r.started_at>now()-interval '30 seconds' or r.snapshot->>'phase' is distinct from 'complete' or coalesce((r.snapshot->>'time')::numeric,0)<30 then raise exception 'HAUNT_EARLY';end if;
 correct:=coalesce(guess=ghosts[1+r.seed%14],false);ev:=least(3,jsonb_array_length(coalesce(r.snapshot->'found','[]')));wipe:=not exists(select 1 from jsonb_array_elements(r.snapshot->'players') p where p->>'alive'='true');
 select size into kind from haunt_private.map_catalog where id=r.map_id;size_factor:=case kind when 'medium' then 1.15 when 'large' then 1.35 when 'huge' then 1.6 else 1 end;scale:=size_factor*case r.difficulty when 'normal' then 1.25 when 'nightmare' then 1.6 else 1 end;
 select least(115,50*least(1,count(*) filter(where p->>'kind'='ghost'))+25*least(1,count(*) filter(where p->>'kind'='bone'))+20*least(2,count(*) filter(where p->>'kind'='uv')))::integer into bonus from(select distinct on (p->>'target') p from jsonb_array_elements(coalesce(r.snapshot->'photos','[]')) p where (p->>'kind'='ghost' and p->>'target'='ghost') or (p->>'kind'='bone' and p->>'target'='bone') or (p->>'kind'='uv' and p->>'target'~'^trace-[0-9]{1,7}$'))x;
 if r.snapshot->'bone'->>'collected'='true' then bonus:=bonus+25;end if;
 xp:=case when wipe then least(30,ev*5) else round((case when correct then 120+ev*30+(case when r.snapshot->'objectives'->>'hunt'='true' then 25 else 0 end)+(case when r.snapshot->'objectives'->>'photo'='true' then 25 else 0 end) else ev*10 end)*size_factor)::integer end;
 money:=case when wipe then 0 else least(900,round(((case when correct then 90 else 0 end)+ev*10+least(140,bonus))*scale)::integer) end;
 for person in select value from jsonb_array_elements(r.roster) loop
  survived:=exists(select 1 from jsonb_array_elements(r.snapshot->'players') p where p->>'id'=person->>'id' and p->>'alive'='true');
  insert into haunt_private.results(room_id,user_id,correct,survived,evidence,xp,money) values(r.id,(person->>'id')::uuid,correct,survived,ev,xp,money) on conflict do nothing;
 end loop;
 perform haunt_private.settle_gear(r.id,wipe);update haunt_private.rooms set phase='complete',updated_at=now() where id=r.id;return haunt_private.room_view(r.id);
end $$;
revoke all on function haunt_private.finish_contract(haunt_private.rooms,jsonb) from public,anon,authenticated;

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
 select * into r from haunt_private.rooms where id=i.room_id and phase='lobby' and protocol=3 and expires_at>now() for update;if r.id is null then raise exception 'HAUNT_ROOM';end if;
 if not exists(select 1 from public.zh_library where user_id=uid and game_id='zone-haunt') then raise exception 'HUB_LIBRARY';end if;
 if exists(select 1 from haunt_private.members m join haunt_private.rooms q on q.id=m.room_id where m.user_id=uid and m.active and q.id<>r.id and q.phase in ('lobby','running') and q.expires_at>now()) then raise exception 'HAUNT_ALREADY';end if;
 if not exists(select 1 from haunt_private.members where room_id=r.id and user_id=uid and active) and (select count(*) from haunt_private.members where room_id=r.id and active)>=4 then raise exception 'HAUNT_FULL';end if;
 perform haunt_private.ensure_gear(uid);insert into haunt_private.members(room_id,user_id) values(r.id,uid) on conflict(room_id,user_id) do update set active=true,ready=false,last_seen=now(),input='{}';update haunt_private.invitations set status='accepted' where id=i.id;return haunt_private.room_view(r.id);
end $$;
revoke all on function haunt_private.invitation_command(text,jsonb) from public,anon,authenticated;

create or replace function haunt_private.progression_command(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();r haunt_private.rooms;room uuid;vcode text;slot integer;doc jsonb;pool jsonb;n integer;required integer;expected text[];seen text[];head jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HAUNT_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>70000 then raise exception 'HAUNT_INPUT';end if;
 if action in ('friends','invite','invitations','accept_invite','decline_invite') then return haunt_private.invitation_command(action,args);end if;
 if action in ('gear_state','gear_buy','gear_select') then return haunt_private.gear_command(action,args);end if;
 if action='home' then
  head:=haunt_private.lobby_command('home','{}');select m.room_id into room from haunt_private.members m join haunt_private.rooms q on q.id=m.room_id where m.user_id=uid and m.active and q.protocol=3 and q.phase in ('lobby','running','complete') and q.expires_at>now() order by m.last_seen desc limit 1;
  if room is not null then head:=head||jsonb_build_object('room',haunt_private.room_view(room));end if;
  if args->>'protocol'='3' and exists(select 1 from public.zh_library where user_id=uid and game_id='zone-haunt') then head:=head||jsonb_build_object('gear',haunt_private.gear_view(uid),'level',haunt_private.level(uid),'invitations',haunt_private.invite_view(uid));end if;return head;
 end if;
 if action in ('create','join') and args->>'protocol'='3' then
  if not exists(select 1 from public.zh_library where user_id=uid and game_id='zone-haunt') then raise exception 'HUB_LIBRARY';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,934));perform haunt_private.ensure_gear(uid);
  if action='create' then
   if (select count(*) from haunt_private.rooms where host_id=uid and created_at>now()-interval '10 minutes')>=10 then raise exception 'HAUNT_RATE';end if;
   if exists(select 1 from haunt_private.members m join haunt_private.rooms q on q.id=m.room_id where m.user_id=uid and m.active and q.phase in ('lobby','running') and q.expires_at>now()) then raise exception 'HAUNT_ALREADY';end if;
   for slot in 1..4 loop vcode:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));begin insert into haunt_private.rooms(code,host_id,protocol,map_id,seed) values(vcode,uid,3,'willow',1+floor(random()*2147483645)::integer) returning id into room;exit;exception when unique_violation then if slot=4 then raise;end if;end;end loop;
   insert into haunt_private.members(room_id,user_id,ready) values(room,uid,true);return haunt_private.room_view(room);
  else
   vcode:=upper(btrim(args->>'code'));if vcode is null or vcode!~'^[A-F0-9]{6}$' then raise exception 'HAUNT_CODE';end if;
   select * into r from haunt_private.rooms where code=vcode and expires_at>now() for update;if r.id is null then raise exception 'HAUNT_ROOM';end if;if r.protocol<>3 then raise exception 'HAUNT_VERSION';end if;
   if exists(select 1 from haunt_private.members where room_id=r.id and user_id=uid and active) then update haunt_private.members set last_seen=now() where room_id=r.id and user_id=uid;return haunt_private.room_view(r.id);end if;
   if r.phase<>'lobby' then raise exception 'HAUNT_STARTED';end if;
   if exists(select 1 from haunt_private.members m join haunt_private.rooms q on q.id=m.room_id where m.user_id=uid and m.active and q.phase in ('lobby','running') and q.expires_at>now()) then raise exception 'HAUNT_ALREADY';end if;
   if (select count(*) from haunt_private.members where room_id=r.id and active)>=4 then raise exception 'HAUNT_FULL';end if;
   insert into haunt_private.members(room_id,user_id) values(r.id,uid) on conflict(room_id,user_id) do update set active=true,ready=false,last_seen=now(),input='{}';return haunt_private.room_view(r.id);
  end if;
 end if;
 if action in ('create','join') then return haunt_private.command(action,args);end if;
 if action in ('start','finish','gear_buy','gear_select','leave') then perform zone_wallet_private.lock();end if;
 if coalesce(args->>'room','')!~'^[a-f0-9-]{36}$' then raise exception 'HAUNT_ROOM';end if;room:=(args->>'room')::uuid;
 select * into r from haunt_private.rooms where id=room and expires_at>now() for update;
 if r.next_room is not null and exists(select 1 from haunt_private.members where room_id=r.next_room and user_id=uid and active) then return haunt_private.room_view(r.next_room);end if;
 if r.id is null or not exists(select 1 from haunt_private.members where room_id=room and user_id=uid and active) then raise exception 'HAUNT_ROOM' using errcode='42501';end if;
 if r.protocol<>3 then return haunt_private.command(action,args);end if;
 update haunt_private.members set last_seen=now() where room_id=room and user_id=uid;update haunt_private.rooms set expires_at=now()+interval '30 minutes' where id=room;
 if action='leave' then if r.host_id=uid then update haunt_private.rooms set phase='closed',updated_at=now() where id=room;end if;update haunt_private.members set active=false,ready=false,input='{}' where room_id=room and user_id=uid;return '{}';
 elsif action='configure' then
  if r.host_id<>uid or r.phase<>'lobby' then raise exception 'HAUNT_HOST' using errcode='42501';end if;
  select min_level into required from haunt_private.map_catalog where id=args->>'mapId';if required is null or coalesce(args->>'difficulty','') not in ('calm','normal','nightmare') or coalesce(args->>'botCount','')!~'^[0-3]$' then raise exception 'HAUNT_INPUT';end if;
  if haunt_private.level(uid)<required then raise exception 'HAUNT_MAP_LOCKED';end if;
  update haunt_private.rooms set map_id=args->>'mapId',difficulty=args->>'difficulty',bot_count=(args->>'botCount')::integer,bots=(args->>'botCount')::integer>0,updated_at=now() where id=room;update haunt_private.members set ready=(user_id=r.host_id) where room_id=room and active;
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
  for slot in 1..4 loop vcode:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));begin insert into haunt_private.rooms(code,host_id,protocol,map_id,difficulty,bots,bot_count,seed) values(vcode,uid,3,r.map_id,r.difficulty,r.bots,r.bot_count,1+floor(random()*2147483645)::integer) returning id into room;exit;exception when unique_violation then if slot=4 then raise;end if;end;end loop;
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
   if jsonb_typeof(doc) is distinct from 'object' or doc->>'schema'<>'3' or doc->>'id'<>room::text or doc->>'mapId'<>r.map_id or jsonb_typeof(doc->'players') is distinct from 'array' or seen is distinct from expected or coalesce(doc->>'phase','') not in ('investigating','complete') or jsonb_typeof(doc->'time')<>'number' or (doc->>'time')::numeric<0 or (doc->>'time')::numeric>1600 or jsonb_array_length(coalesce(doc->'found','[]'))>4 or jsonb_array_length(coalesce(doc->'devices','[]'))>48 or jsonb_array_length(coalesce(doc->'photos','[]'))>4 then raise exception 'HAUNT_INPUT';end if;
   if exists(select 1 from jsonb_array_elements(doc->'players')p where jsonb_typeof(p->'alive') is distinct from 'boolean') then raise exception 'HAUNT_INPUT';end if;
   if coalesce((r.snapshot->>'time')::numeric,0)<=(doc->>'time')::numeric then update haunt_private.rooms set snapshot=doc,updated_at=now() where id=room;end if;
  end if;
 else raise exception 'HAUNT_ACTION';end if;
 return haunt_private.room_view(room);
end $$;
revoke all on function haunt_private.progression_command(text,jsonb) from public,anon;
grant execute on function haunt_private.progression_command(text,jsonb) to authenticated;
create or replace function public.zone_haunt(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select haunt_private.progression_command(action,args) $$;

create or replace function zone_hub_private.haunt_economy_command(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();result jsonb;doc jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>262144 then raise exception 'HUB_INPUT';end if;
 if action='add_game' and args->>'game_id'='zone-haunt' then
  perform zone_wallet_private.lock();if exists(select 1 from public.zh_library where user_id=uid and game_id='zone-haunt') then return '{}';end if;
  if not exists(select 1 from public.zh_games where id='zone-haunt' and published) then raise exception 'HUB_GAME';end if;
  if args->>'purchasePrice' is distinct from '500' then raise exception 'HUB_PURCHASE_CONFIRM';end if;
  perform zone_wallet_private.ensure(uid);perform zone_wallet_private.change(uid,-500,'game_purchase','zone-haunt','zone-haunt');insert into public.zh_library(user_id,game_id) values(uid,'zone-haunt');
  select json into doc from public.saves where user_id=uid for update;update public.saves set json=zone_wallet_private.project(doc,uid),updated_at=now() where user_id=uid;perform haunt_private.ensure_gear(uid);return '{}';
 end if;
 result:=zone_hub_private.wallet_hub_command(action,args);if action='home' then result:=result||jsonb_build_object('hauntInvites',haunt_private.invite_view(uid));end if;return result;
end $$;
revoke all on function zone_hub_private.haunt_economy_command(text,jsonb) from public,anon;
grant execute on function zone_hub_private.haunt_economy_command(text,jsonb) to authenticated;
create or replace function public.zone_hub(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select zone_hub_private.haunt_economy_command(action,args) $$;
update public.zh_games set free=false,price_zc=500,description_pl='Kooperacyjne śledztwa 2.5D, biuro ekipy z koszykówką, 12 map, zakup i ryzyko utraty sprzętu, poziomy i zaproszenia znajomych.',description_en='Cooperative 2.5D investigations, a team garage with basketball, 12 maps, equipment purchases and loss, levels and friend invitations.' where id='zone-haunt';
notify pgrst,'reload schema';
