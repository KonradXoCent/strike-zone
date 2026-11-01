-- ZF is earned by card sales or exchanged from Zone Hub coins at a fixed 10:1 rate.
-- All money and escrow mutations share the existing wallet transaction lock.
alter table zone_football_private.clubs add column if not exists zf bigint not null default 0 check(zf between 0 and 1000000000000);
create table if not exists zone_football_private.pack_catalog(id text primary key,data jsonb not null);
insert into zone_football_private.pack_catalog(id,data) values
('bronze','{"id":"bronze","name":"Kickoff","price":750,"count":3,"odds":[85,14,1,0]}'::jsonb),
('silver','{"id":"silver","name":"Rising Stars","price":2000,"count":3,"odds":[0,85,14,1]}'::jsonb),
('gold','{"id":"gold","name":"Elite Nights","price":5000,"count":3,"odds":[0,0,94,6]}'::jsonb),
('defenders','{"id":"defenders","name":"Backline","price":1600,"count":3,"odds":[15,75,9,1],"positions":["GK","LB","CB","RB"]}'::jsonb),
('midfield','{"id":"midfield","name":"Playmakers","price":2400,"count":3,"odds":[0,65,32,3],"positions":["CM","CAM"]}'::jsonb),
('attackers','{"id":"attackers","name":"Goal Hunters","price":2400,"count":3,"odds":[0,65,32,3],"positions":["LW","ST","RW"]}'::jsonb),
('elite','{"id":"elite","name":"Starlight","price":12000,"count":3,"odds":[0,0,75,25]}'::jsonb)
on conflict(id) do update set data=excluded.data;
create table if not exists zone_football_private.orders(
 user_id uuid not null references auth.users(id) on delete cascade,nonce uuid not null,action text not null,args jsonb not null,outcome jsonb not null,
 delta_zf bigint not null default 0,created_at timestamptz not null default now(),primary key(user_id,nonce));
create table if not exists zone_football_private.card_market(
 id uuid primary key default gen_random_uuid(),seller_id uuid not null references auth.users(id) on delete cascade,
 card jsonb not null,player_id text not null references zone_football_private.players(id),price bigint not null check(price between 1 and 1000000),
 status text not null default 'active' check(status in ('active','sold','withdrawn')),buyer_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),closed_at timestamptz);
create index if not exists football_market_active_price on zone_football_private.card_market(price,id) where status='active';
create index if not exists football_market_owner on zone_football_private.card_market(seller_id,created_at desc) where status='active';
create index if not exists football_market_player on zone_football_private.card_market(player_id,price) where status='active';
create unique index if not exists football_market_escrow_card on zone_football_private.card_market((card->>'id')) where status='active';
alter table zone_football_private.pack_catalog enable row level security;
alter table zone_football_private.orders enable row level security;
alter table zone_football_private.card_market enable row level security;
revoke all on zone_football_private.pack_catalog,zone_football_private.orders,zone_football_private.card_market from public,anon,authenticated;

create or replace function zone_football_private.market_command(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();result jsonb;club zone_football_private.clubs;receipt zone_football_private.orders;legacy zone_football_private.packs;listing zone_football_private.card_market;
 nonce uuid;kind text;pack jsonb;price bigint;credit bigint:=0;debit_zc bigint;card jsonb;pulled jsonb:='[]';outcome jsonb:='{}';pid text;tier text;roll float;total float;
 role_list jsonb;checked record;filter_position text;filter_query text;page integer;rows jsonb;own_rows jsonb;
begin
 -- The existing command verifies auth, ownership and lock order before every action.
 result:=zone_football_private.packs_command('state','{}');
 if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>20000 then raise exception 'FOOTBALL_INPUT';end if;
 select * into club from zone_football_private.clubs where user_id=uid for update;
 if action='state' then return result;
 elsif action='squad' then
  role_list:=case args->>'formation'
   when '4-3-3' then '["GK","LB","CB","CB","RB","CM","CM","CAM","LW","ST","RW"]'::jsonb
   when '4-4-2' then '["GK","LB","CB","CB","RB","LW","CM","CM","RW","ST","ST"]'::jsonb
   when '3-5-2' then '["GK","CB","CB","CB","LW","CM","CM","CAM","RW","ST","ST"]'::jsonb end;
  if role_list is null or jsonb_typeof(args->'squad') is distinct from 'array' then raise exception 'FOOTBALL_SQUAD';end if;
  for checked in select x.ordinality,p.data from jsonb_array_elements(args->'squad') with ordinality x join lateral(select a.value from jsonb_array_elements(club.cards)a where a.value->>'id'=x.value#>>'{}')a on true join zone_football_private.players p on p.id=a.value->>'player_id' where x.ordinality<=11 loop
   if checked.data->>'position' is distinct from role_list->>(checked.ordinality::int-1) then raise exception 'FOOTBALL_POSITION';end if;
  end loop;
  return zone_football_private.packs_command(action,args);
 elsif action='market' then
  filter_position:=nullif(args->>'position','');filter_query:=left(lower(coalesce(args->>'query','')),50);
  if coalesce(args->>'page','0')!~'^[0-9]{1,5}$' then raise exception 'FOOTBALL_INPUT';end if;page:=(coalesce(args->>'page','0'))::int;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows from (
   select m.id,m.player_id,m.price,m.created_at,c.name as seller,m.seller_id=uid as own
   from zone_football_private.card_market m join zone_football_private.players p on p.id=m.player_id join zone_football_private.clubs c on c.user_id=m.seller_id
   where m.status='active' and (filter_position is null or p.data->>'position'=filter_position) and (filter_query='' or position(filter_query in lower(p.data->>'name'))>0)
   order by m.price,m.id limit 31 offset least(page,10000)*30)x;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into own_rows from (
   select m.id,m.player_id,m.price,m.created_at,true as own,club.name as seller from zone_football_private.card_market m where m.seller_id=uid and m.status='active' order by m.created_at desc,m.id limit 50)x;
  return result||jsonb_build_object('market',jsonb_build_object('rows',rows,'own',own_rows,'page',page,'has_more',jsonb_array_length(rows)>30));
 elsif action in ('topup','buy_pack','quick_sell','market_list','market_buy','market_withdraw') then
  if coalesce(args->>'nonce','')!~'^[a-f0-9-]{36}$' then raise exception 'FOOTBALL_NONCE';end if;nonce:=(args->>'nonce')::uuid;
  select * into receipt from zone_football_private.orders o where o.user_id=uid and o.nonce=nonce;
  if receipt.user_id is not null then
   if receipt.action is distinct from action or receipt.args is distinct from args-'nonce' then raise exception 'FOOTBALL_NONCE';end if;
   return result||receipt.outcome;
  end if;
  -- Nonces belong to one operation, including historic and promotional packs.
  select * into legacy from zone_football_private.packs p where p.user_id=uid and p.nonce=nonce;
  if legacy.user_id is not null then
   if action='buy_pack' and legacy.pack=args->>'pack' then return result||jsonb_build_object('pulled',legacy.cards);end if;
   raise exception 'FOOTBALL_NONCE';
  end if;
  if action='topup' then
   kind:=args->>'bundle';debit_zc:=case kind when 'zf-1000' then 100 when 'zf-5000' then 500 when 'zf-10000' then 1000 end;
   if debit_zc is null or args->>'expected_zc' is distinct from debit_zc::text then raise exception 'FOOTBALL_PRICE';end if;
   credit:=debit_zc*10;
   perform zone_wallet_private.change(uid,-debit_zc,'football_zf',nonce::text,'zone-football');
   update public.saves set json=zone_wallet_private.project(json,uid),updated_at=now() where user_id=uid;
   update zone_football_private.clubs set zf=zf+credit,revision=revision+1 where user_id=uid;
   outcome:=jsonb_build_object('credited',credit);
  elsif action='buy_pack' then
   kind:=args->>'pack';select data into pack from zone_football_private.pack_catalog where id=kind;
   if pack is null then raise exception 'FOOTBALL_PACK';end if;price:=(pack->>'price')::bigint;
   if args->>'expected_zf' is distinct from price::text then raise exception 'FOOTBALL_PRICE';end if;
   if club.zf<price then raise exception 'FOOTBALL_ZF_FUNDS';end if;
   if jsonb_array_length(club.cards)>4997 then raise exception 'FOOTBALL_CARD_LIMIT';end if;
   for i in 1..3 loop
    roll:=random()*100;total:=0;
    for j in 0..3 loop total:=total+(pack->'odds'->>j)::float;if roll<total then tier:=(array['bronze','silver','gold','elite'])[j+1];exit;end if;end loop;
    select p.id into pid from zone_football_private.players p where p.data->>'tier'=tier and (not(pack?'positions') or pack->'positions' ? (p.data->>'position')) order by random() limit 1;
    if pid is null then raise exception 'FOOTBALL_PACK';end if;
    pulled:=pulled||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'player_id',pid));
   end loop;
   credit:=-price;
   insert into zone_football_private.packs(user_id,nonce,pack,cards) values(uid,nonce,kind,pulled);
   update zone_football_private.clubs set zf=zf-price,cards=cards||pulled,revision=revision+1 where user_id=uid;
   outcome:=jsonb_build_object('pulled',pulled);
  elsif action in ('quick_sell','market_list') then
   select c.value into card from jsonb_array_elements(club.cards)c where c.value->>'id'=args->>'card';
   if card is null then raise exception 'FOOTBALL_CARD';end if;
   if club.squad ? (card->>'id') then raise exception 'FOOTBALL_EQUIPPED';end if;
   if exists(select 1 from zone_football_private.rooms where expires_at>now() and uid in(host_id,guest_id)) then raise exception 'FOOTBALL_ROOM_LOCK';end if;
   if action='quick_sell' then
    select p.data->>'tier' into tier from zone_football_private.players p where p.id=card->>'player_id';
    credit:=case tier when 'bronze' then 20 when 'silver' then 60 when 'gold' then 180 when 'elite' then 400 end;
    if args->>'expected_zf' is distinct from credit::text then raise exception 'FOOTBALL_PRICE';end if;
    outcome:=jsonb_build_object('sold',card->>'id','credited',credit);
   else
    if coalesce(args->>'price','')!~'^[0-9]{1,7}$' then raise exception 'FOOTBALL_PRICE';end if;price:=(args->>'price')::bigint;
    if price<1 or price>1000000 then raise exception 'FOOTBALL_PRICE';end if;
    if (select count(*) from zone_football_private.card_market where seller_id=uid and status='active')>=50 then raise exception 'FOOTBALL_MARKET_LIMIT';end if;
    insert into zone_football_private.card_market(seller_id,card,player_id,price) values(uid,card,card->>'player_id',price) returning * into listing;
    outcome:=jsonb_build_object('listing_id',listing.id);
   end if;
   update zone_football_private.clubs set cards=(select coalesce(jsonb_agg(c.value),'[]') from jsonb_array_elements(club.cards)c where c.value->>'id'<>card->>'id'),zf=zf+credit,revision=revision+1 where user_id=uid;
  else
   select * into listing from zone_football_private.card_market where id=(args->>'listing')::uuid for update;
   if listing.id is null or listing.status<>'active' then raise exception 'FOOTBALL_LISTING_CLOSED';end if;
   if jsonb_array_length(club.cards)>=5000 then raise exception 'FOOTBALL_CARD_LIMIT';end if;
   if action='market_withdraw' then
    if listing.seller_id<>uid then raise exception 'FOOTBALL_LISTING_OWNER';end if;
    update zone_football_private.card_market set status='withdrawn',closed_at=now() where id=listing.id;
    update zone_football_private.clubs set cards=cards||jsonb_build_array(listing.card),revision=revision+1 where user_id=uid;
   else
    if listing.seller_id=uid then raise exception 'FOOTBALL_SELF_BUY';end if;
    if args->>'expected_zf' is distinct from listing.price::text then raise exception 'FOOTBALL_PRICE';end if;
    if club.zf<listing.price then raise exception 'FOOTBALL_ZF_FUNDS';end if;
    -- The shared lock is acquired before both clubs, so simultaneous purchases cannot deadlock or buy twice.
    perform 1 from zone_football_private.clubs where user_id=listing.seller_id for update;
    update zone_football_private.clubs set zf=zf+listing.price,revision=revision+1 where user_id=listing.seller_id;
    update zone_football_private.clubs set zf=zf-listing.price,cards=cards||jsonb_build_array(listing.card),revision=revision+1 where user_id=uid;
    update zone_football_private.card_market set status='sold',buyer_id=uid,closed_at=now() where id=listing.id;
    credit:=-listing.price;
   end if;
   outcome:=jsonb_build_object('listing_id',listing.id);
  end if;
  insert into zone_football_private.orders(user_id,nonce,action,args,outcome,delta_zf) values(uid,nonce,action,args-'nonce',outcome,credit);
  return zone_football_private.packs_command('state','{}')||outcome;
 else
  if action='open_test_pack' and exists(select 1 from zone_football_private.orders o where o.user_id=uid and o.nonce=(args->>'nonce')::uuid) then raise exception 'FOOTBALL_NONCE';end if;
  return zone_football_private.packs_command(action,args);
 end if;
end $$;
revoke all on function zone_football_private.market_command(text,jsonb) from public,anon;
grant execute on function zone_football_private.market_command(text,jsonb) to authenticated;
-- Revoke older entry points so they cannot bypass ZF pricing or slot validation.
revoke execute on function zone_football_private.command(text,jsonb),zone_football_private.packs_command(text,jsonb) from authenticated;
create or replace function public.zone_football(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select zone_football_private.market_command(action,args) $$;
revoke all on function public.zone_football(text,jsonb) from public,anon;
grant execute on function public.zone_football(text,jsonb) to authenticated;
update public.zh_games set package_config=coalesce(package_config,'{}')||'{"version":"0.3.0"}'::jsonb where id='zone-football';
