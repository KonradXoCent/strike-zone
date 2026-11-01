-- Zone Football clubs. No client-supplied balances, card ratings or pack prices.
insert into public.zh_games(id,title,description_pl,description_en,tags,free,published,price_zc,package_config) values
('zone-football','Zone Football','Piłka 5 na 5 oraz Ultimate Team 11 na 11. Własny klub, paczki, ligi i puchary.','5v5 football and 11v11 Ultimate Team. Your club, player packs, leagues and cups.',array['Sport','Football','Multiplayer','Bots'],false,true,50,'{"protocol":1,"bundle":"zone-football","version":"0.2.0"}')
on conflict(id) do update set price_zc=50,free=false,published=true,description_pl=excluded.description_pl,description_en=excluded.description_en,package_config=excluded.package_config;
create schema if not exists zone_football_private;
revoke all on schema zone_football_private from public,anon;
grant usage on schema zone_football_private to authenticated;
create table if not exists zone_football_private.players(id text primary key,data jsonb not null);
create table if not exists zone_football_private.clubs(user_id uuid primary key references auth.users(id) on delete cascade,name text not null default 'Zone United',formation text not null default '4-3-3',cards jsonb not null default '[]',squad jsonb not null default '[]',progress jsonb not null default '{}',revision bigint not null default 1);
create table if not exists zone_football_private.packs(user_id uuid not null references auth.users(id) on delete cascade,nonce uuid not null,pack text not null,cards jsonb not null,created_at timestamptz not null default now(),primary key(user_id,nonce));
create table if not exists zone_football_private.rooms(id uuid primary key default gen_random_uuid(),code text unique not null,topic uuid not null default gen_random_uuid(),host_id uuid not null references auth.users(id) on delete cascade,guest_id uuid references auth.users(id) on delete set null,expires_at timestamptz not null default now()+interval '2 hours');
create index if not exists football_rooms_host on zone_football_private.rooms(host_id);
create index if not exists football_rooms_guest on zone_football_private.rooms(guest_id);
create index if not exists football_rooms_expiry on zone_football_private.rooms(expires_at);
alter table zone_football_private.players enable row level security;
alter table zone_football_private.clubs enable row level security;
alter table zone_football_private.packs enable row level security;
alter table zone_football_private.rooms enable row level security;
revoke all on all tables in schema zone_football_private from public,anon,authenticated;
-- CATALOG INSERTED BY scripts/football-economy-sql.cjs

create or replace function zone_football_private.public_club(target uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('user_id',c.user_id,'name',c.name,'formation',c.formation,'roster',coalesce((select jsonb_agg(p.data||jsonb_build_object('cardId',x.value#>>'{}') order by x.ordinality) from jsonb_array_elements(c.squad) with ordinality x join lateral(select a.value from jsonb_array_elements(c.cards) a where a.value->>'id'=x.value#>>'{}')a on true join zone_football_private.players p on p.id=a.value->>'player_id'),'[]')) from zone_football_private.clubs c where c.user_id=target
$$;
revoke all on function zone_football_private.public_club(uuid) from public,anon,authenticated;
create or replace function zone_football_private.command(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();club zone_football_private.clubs;room zone_football_private.rooms;cards jsonb:='[]';squad jsonb:='[]';pulled jsonb:='[]';card jsonb;pid text;nonce uuid;pack text;price integer;roll float;tier text;oldpack zone_football_private.packs;checked record;starter text[]:=array['zf-001','zf-002','zf-003','zf-012','zf-004','zf-005','zf-014','zf-006','zf-007','zf-008','zf-009','zf-010','zf-021','zf-011','zf-023','zf-015','zf-017','zf-018'];
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if args is null or jsonb_typeof(args)<>'object' or octet_length(args::text)>20000 then raise exception 'FOOTBALL_INPUT';end if;
 if not exists(select 1 from public.zh_library where user_id=uid and game_id='zone-football') then raise exception 'FOOTBALL_OWNERSHIP' using errcode='42501';end if;
 perform zone_wallet_private.lock();perform zone_wallet_private.ensure(uid);
 select * into club from zone_football_private.clubs where user_id=uid for update;
 if club.user_id is null then
  foreach pid in array starter loop card:=jsonb_build_object('id',gen_random_uuid(),'player_id',pid);cards:=cards||jsonb_build_array(card);squad:=squad||jsonb_build_array(card->'id');end loop;
  insert into zone_football_private.clubs(user_id,cards,squad) values(uid,cards,squad) returning * into club;
 end if;
 if action='state' then null;
 elsif action='squad' then
  squad:=args->'squad';
  if coalesce(args->>'formation','') not in ('4-3-3','4-4-2','3-5-2') or jsonb_typeof(squad) is distinct from 'array' or jsonb_array_length(squad)<>18 then raise exception 'FOOTBALL_SQUAD';end if;
  if (select count(distinct x.value#>>'{}') from jsonb_array_elements(squad)x)<>18 then raise exception 'FOOTBALL_SQUAD';end if;
  if (select count(distinct a.value->>'player_id') from jsonb_array_elements(squad)x join lateral(select v.value from jsonb_array_elements(club.cards)v where v.value->>'id'=x.value#>>'{}')a on true)<>18 then raise exception 'FOOTBALL_SQUAD';end if;
  for checked in select x.value,x.ordinality,p.data from jsonb_array_elements(squad) with ordinality x join lateral(select a.value from jsonb_array_elements(club.cards)a where a.value->>'id'=x.value#>>'{}')a on true join zone_football_private.players p on p.id=a.value->>'player_id' loop
   if (checked.ordinality=1 and checked.data->>'position'<>'GK') or (checked.ordinality between 2 and 11 and checked.data->>'position'='GK') then raise exception 'FOOTBALL_KEEPER';end if;
  end loop;
  if length(btrim(coalesce(args->>'name','')))<2 or length(args->>'name')>28 or args->>'name'~'[[:cntrl:]]' then raise exception 'FOOTBALL_NAME';end if;
  update zone_football_private.clubs set squad=squad,formation=args->>'formation',name=btrim(args->>'name'),revision=revision+1 where user_id=uid returning * into club;
 elsif action='buy_pack' then
  if coalesce(args->>'nonce','')!~'^[a-f0-9-]{36}$' then raise exception 'FOOTBALL_NONCE';end if;nonce:=(args->>'nonce')::uuid;pack:=args->>'pack';
  select * into oldpack from zone_football_private.packs p where p.user_id=uid and p.nonce=nonce;
  if oldpack.user_id is not null then
   if oldpack.pack is distinct from pack then raise exception 'FOOTBALL_NONCE';end if;pulled:=oldpack.cards;
  else
   price:=case pack when 'bronze' then 75 when 'silver' then 200 when 'gold' then 500 else null end;
   if price is null or jsonb_array_length(club.cards)>4997 then raise exception 'FOOTBALL_PACK';end if;
   perform zone_wallet_private.change(uid,-price::bigint,'football_pack',nonce::text,'zone-football');
   for i in 1..3 loop
    roll:=random()*100;tier:=case when pack='bronze' then case when roll<85 then 'bronze' when roll<99 then 'silver' else 'gold' end when pack='silver' then case when roll<85 then 'silver' when roll<99 then 'gold' else 'elite' end else case when roll<94 then 'gold' else 'elite' end end;
    select p.id into pid from zone_football_private.players p where p.data->>'tier'=tier order by random() limit 1;
    card:=jsonb_build_object('id',gen_random_uuid(),'player_id',pid);pulled:=pulled||jsonb_build_array(card);
   end loop;
   insert into zone_football_private.packs(user_id,nonce,pack,cards) values(uid,nonce,pack,pulled);
   update zone_football_private.clubs set cards=club.cards||pulled,revision=revision+1 where user_id=uid returning * into club;
   update public.saves set json=zone_wallet_private.project(json,uid),updated_at=now() where user_id=uid;
  end if;
 elsif action='progress' then
  if jsonb_typeof(args->'progress') is distinct from 'object' or octet_length((args->'progress')::text)>12000 then raise exception 'FOOTBALL_PROGRESS';end if;
  -- Personal, unranked history only. Results never mint currency or cards.
  update zone_football_private.clubs set progress=args->'progress',revision=revision+1 where user_id=uid returning * into club;
 elsif action='room_create' then
  delete from zone_football_private.rooms where expires_at<now() or host_id=uid;
  insert into zone_football_private.rooms(code,host_id) values(upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),uid) returning * into room;
 elsif action='room_join' then
  select * into room from zone_football_private.rooms where code=upper(args->>'code') and expires_at>now() for update;
  if room.id is null or room.host_id=uid or (room.guest_id is not null and room.guest_id<>uid) then raise exception 'FOOTBALL_ROOM';end if;
  update zone_football_private.rooms set guest_id=uid where id=room.id returning * into room;
 elsif action in ('room_state','room_leave') then
  select * into room from zone_football_private.rooms where id=(args->>'id')::uuid and expires_at>now() and uid in(host_id,guest_id) for update;
  if room.id is null then raise exception 'FOOTBALL_ROOM';end if;
  if action='room_leave' then
   if room.host_id=uid then delete from zone_football_private.rooms where id=room.id;else update zone_football_private.rooms set guest_id=null where id=room.id;end if;
   return jsonb_build_object('left',true);
  end if;
 else raise exception 'FOOTBALL_ACTION';end if;
 if room.id is not null then return jsonb_build_object('id',room.id,'code',room.code,'topic',room.topic,'host_id',room.host_id,'guest_id',room.guest_id,'host',zone_football_private.public_club(room.host_id),'guest',zone_football_private.public_club(room.guest_id));end if;
 return jsonb_build_object('club',to_jsonb(club)-'user_id','wallet',zone_wallet_private.view(uid),'pulled',pulled);
end $$;
revoke all on function zone_football_private.command(text,jsonb) from public,anon;
grant execute on function zone_football_private.command(text,jsonb) to authenticated;
create or replace function public.zone_football(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select zone_football_private.command(action,args) $$;
revoke all on function public.zone_football(text,jsonb) from public,anon;
grant execute on function public.zone_football(text,jsonb) to authenticated;

-- Keep Haunt economy and wallet routing intact; add only the Football purchase.
create or replace function zone_hub_private.football_hub_command(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();doc jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>262144 then raise exception 'HUB_INPUT';end if;
 if action='add_game' and args->>'game_id'='zone-football' then
  perform zone_wallet_private.lock();if exists(select 1 from public.zh_library where user_id=uid and game_id='zone-football') then return '{}';end if;
  if not exists(select 1 from public.zh_games where id='zone-football' and published and price_zc=50) then raise exception 'HUB_GAME';end if;
  if args->>'purchasePrice' is distinct from '50' then raise exception 'HUB_PURCHASE_CONFIRM';end if;
  perform zone_wallet_private.ensure(uid);perform zone_wallet_private.change(uid,-50,'game_purchase','zone-football','zone-football');insert into public.zh_library(user_id,game_id) values(uid,'zone-football');
  select json into doc from public.saves where user_id=uid for update;update public.saves set json=zone_wallet_private.project(doc,uid),updated_at=now() where user_id=uid;return '{}';
 end if;
 return zone_hub_private.haunt_economy_command(action,args);
end $$;
revoke all on function zone_hub_private.football_hub_command(text,jsonb) from public,anon;
grant execute on function zone_hub_private.football_hub_command(text,jsonb) to authenticated;
create or replace function public.zone_hub(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select zone_hub_private.football_hub_command(action,args) $$;
