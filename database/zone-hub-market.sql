-- Escrowed, game-scoped listings. No real money is used.
alter table public.zh_item_definitions add column if not exists market_price integer not null default 500 check(market_price between 1 and 10000000);
update public.zh_item_definitions set market_price=case when category in ('knife','gloves') then 12000*(rarity+1) when category='agent' then 2500*(rarity+1) else 300*(rarity+1)*(rarity+1) end where market_price=500;
create table if not exists zone_hub_private.market_listings(
 id uuid primary key default gen_random_uuid(),seller_id uuid references auth.users(id) on delete cascade,seller_profile text,bot_name text,
 item text not null references public.zh_item_definitions(id),game_id text not null references public.zh_games(id),price integer not null check(price between 1 and 10000000),kills bigint not null default 0,
 status text not null default 'active' check(status in ('active','sold','cancelled')),buyer_id uuid references auth.users(id) on delete set null,buyer_bot text,
 created_at timestamptz not null default now(),closed_at timestamptz,
 check((seller_id is null)=(bot_name is not null))
);
create index if not exists zh_market_feed on zone_hub_private.market_listings(game_id,price,created_at) where status='active';
create index if not exists zh_market_seller on zone_hub_private.market_listings(seller_id,created_at);
create index if not exists zh_market_buyer on zone_hub_private.market_listings(buyer_id);
create index if not exists zh_market_item on zone_hub_private.market_listings(item);
create table if not exists zone_hub_private.market_bots(id boolean primary key default true check(id),day date not null default current_date,spent bigint not null default 0,last_tick timestamptz,last_stock timestamptz);
insert into zone_hub_private.market_bots(id) values(true) on conflict do nothing;
alter table zone_hub_private.market_listings enable row level security;alter table zone_hub_private.market_bots enable row level security;
revoke all on zone_hub_private.market_listings,zone_hub_private.market_bots from public,anon,authenticated;

create or replace function zone_hub_private.market_adjust(doc jsonb,pkey text,game text,delta bigint) returns jsonb language plpgsql set search_path='' as $$
declare p jsonb:=doc->'profiles'->pkey;r jsonb;balance bigint;totals jsonb;old_delta bigint;
begin
 if p is null then raise exception 'MARKET_PROFILE';end if;
 if game='zone-royale' then r:=coalesce(p->'royale','{}');balance:=coalesce((r->>'wallet')::bigint,2500);else balance:=coalesce((p->>'wallet')::bigint,0);end if;
 if balance+delta<0 then raise exception 'MARKET_FUNDS';end if;
 if game='zone-royale' then p:=jsonb_set(p,'{royale}',r||jsonb_build_object('wallet',balance+delta));else p:=jsonb_set(p,'{wallet}',to_jsonb(balance+delta));end if;
 doc:=jsonb_set(doc,array['profiles',pkey],p);totals:=coalesce(doc->'zhMarket','{}');old_delta:=coalesce((totals->pkey->>game)::bigint,0);totals:=jsonb_set(totals,array[pkey],coalesce(totals->pkey,'{}')||jsonb_build_object(game,old_delta+delta));
 return doc||jsonb_build_object('zhMarket',totals,'zhEpoch',gen_random_uuid()::text,'ts',floor(extract(epoch from clock_timestamp())*1000));
end $$;
revoke all on function zone_hub_private.market_adjust(jsonb,text,text,bigint) from public,anon,authenticated;

create or replace function zone_hub_private.market_settle(offer uuid,buyer uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare row zone_hub_private.market_listings;doc jsonb;other jsonb;p jsonb;pkey text;first_uid uuid;second_uid uuid;
begin
 select * into row from zone_hub_private.market_listings where id=offer for update;
 if not found or row.status<>'active' then raise exception 'MARKET_GONE';end if;
 if row.seller_id=buyer or row.seller_id is null and buyer is null then raise exception 'MARKET_SELF';end if;
 first_uid:=least(row.seller_id,buyer);second_uid:=greatest(row.seller_id,buyer);
 if first_uid is not null then perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(first_uid::text,824));end if;
 if second_uid is not null and second_uid is distinct from first_uid then perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(second_uid::text,824));end if;
 perform 1 from public.saves where user_id in (row.seller_id,buyer) order by user_id for update;
 if buyer is not null then
  doc:=zone_hub_private.document(buyer);pkey:=doc->>'cur';doc:=zone_hub_private.market_adjust(doc,pkey,row.game_id,-row.price);p:=doc->'profiles'->pkey;p:=zone_hub_private.change_item(p,row.item,1);doc:=jsonb_set(doc,array['profiles',pkey],p);
  update public.saves set json=doc,updated_at=now() where user_id=buyer;
 end if;
 if row.seller_id is not null then other:=zone_hub_private.document(row.seller_id);other:=zone_hub_private.market_adjust(other,row.seller_profile,row.game_id,row.price);update public.saves set json=other,updated_at=now() where user_id=row.seller_id;end if;
 update zone_hub_private.market_listings set status='sold',buyer_id=buyer,buyer_bot=case when buyer is null then 'Zone Trader Bot' end,closed_at=now() where id=row.id;
 return jsonb_build_object('id',row.id,'status','sold','item',row.item,'game_id',row.game_id,'price',row.price);
end $$;
revoke all on function zone_hub_private.market_settle(uuid,uuid) from public,anon,authenticated;

create or replace function zone_hub_private.market_bot_tick() returns jsonb language plpgsql security definer set search_path='' as $$
declare state zone_hub_private.market_bots;row record;bought integer:=0;stocked integer:=0;game text;
begin
 if not pg_catalog.pg_try_advisory_xact_lock(28003419) then return '{}';end if;
 select * into state from zone_hub_private.market_bots where id=true for update;
 if state.last_tick>now()-interval '55 seconds' then return '{}';end if;
 if state.day<>current_date then state.day:=current_date;state.spent:=0;end if;
 for row in select l.id,l.price from zone_hub_private.market_listings l join public.zh_item_definitions d on d.id=l.item where l.status='active' and l.seller_id is not null and l.created_at<now()-interval '1 minute' and l.price<=d.market_price*.95 and random()<.35 order by random() limit 3 loop
  if state.spent+row.price>250000 then continue;end if;
  begin perform zone_hub_private.market_settle(row.id,null);state.spent:=state.spent+row.price;bought:=bought+1;exception when others then null;end;
 end loop;
 if state.last_stock is null or state.last_stock<now()-interval '30 minutes' then
  update zone_hub_private.market_listings set status='cancelled',closed_at=now() where seller_id is null and status='active' and created_at<now()-interval '2 hours';
  foreach game in array array['strike-zone','zone-royale'] loop
   insert into zone_hub_private.market_listings(bot_name,item,game_id,price)
    select 'Zone Supply Bot',d.id,d.game_id,greatest(1,round(d.market_price*(1.08+random()*.15))::integer) from public.zh_item_definitions d where d.game_id=game and d.tradable and d.category not in ('case','key','community') and d.id not like '%:st' order by random() limit greatest(0,12-(select count(*) from zone_hub_private.market_listings l where l.seller_id is null and l.game_id=game and l.status='active'));
  end loop;state.last_stock:=now();
 end if;
 update zone_hub_private.market_bots set day=state.day,spent=state.spent,last_tick=now(),last_stock=state.last_stock where id=true;
 return jsonb_build_object('purchases',bought,'spent_today',state.spent);
end $$;
revoke all on function zone_hub_private.market_bot_tick() from public,anon,authenticated;

create or replace function zone_hub_private.market_command(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();game text:=args->>'game_id';doc jsonb;p jsonb;row zone_hub_private.market_listings;price integer;item text;result jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args)<>'object' or octet_length(args::text)>8192 then raise exception 'HUB_INPUT';end if;
 if action='market_list' then
  if game not in ('strike-zone','zone-royale') or game is null then raise exception 'HUB_INPUT';end if;
  perform zone_hub_private.market_bot_tick();doc:=zone_hub_private.document(uid);p:=doc->'profiles'->(doc->>'cur');
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from(select l.id,l.item,l.game_id,l.price,l.kills,l.created_at,d.title,d.category,d.rarity,l.seller_id=uid as mine,l.seller_id is null as bot,coalesce(l.bot_name,n.name,'Player') as seller_name from zone_hub_private.market_listings l join public.zh_item_definitions d on d.id=l.item left join public.leaderboard n on n.user_id=l.seller_id where l.status='active' and l.game_id=game and (coalesce(args->>'search','')='' or d.title ilike '%'||left(args->>'search',80)||'%') order by l.price,l.created_at limit 100) x;
  return jsonb_build_object('listings',result,'items',zone_hub_private.inventory(uid),'wallet',case when game='zone-royale' then coalesce(p->'royale'->'wallet','2500') else coalesce(p->'wallet','0') end,'history',coalesce((select jsonb_agg(to_jsonb(x)) from(select h.id,h.item,h.price,h.status,h.buyer_bot,h.bot_name,h.game_id,h.closed_at from zone_hub_private.market_listings h where uid in(h.seller_id,h.buyer_id) order by h.created_at desc limit 30)x),'[]'));
 elsif action='market_sell' then
  if coalesce(args->>'price','')!~'^[0-9]{1,8}$' then raise exception 'MARKET_PRICE';end if;price:=(args->>'price')::integer;if price<1 or price>10000000 then raise exception 'MARKET_PRICE';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,824));
  if (select count(*) from zone_hub_private.market_listings where seller_id=uid and status='active')>=20 or (select count(*) from zone_hub_private.market_listings where seller_id=uid and created_at>now()-interval '24 hours')>=100 then raise exception 'HUB_RATE';end if;
  perform 1 from public.saves where user_id=uid for update;doc:=zone_hub_private.document(uid);p:=doc->'profiles'->(doc->>'cur');item:=args->>'item';select game_id into game from public.zh_item_definitions where id=item and tradable;if game is null or zone_hub_private.item_count(p,item)<1 then raise exception 'MARKET_ITEM';end if;
  insert into zone_hub_private.market_listings(seller_id,seller_profile,item,game_id,price,kills) values(uid,doc->>'cur',item,game,price,case when item like '%:st' then coalesce((p->'stk'->>item)::bigint,0) else 0 end) returning * into row;
  p:=zone_hub_private.change_item(p,item,-1);doc:=jsonb_set(doc,array['profiles',doc->>'cur'],p)||jsonb_build_object('zhEpoch',gen_random_uuid()::text,'ts',floor(extract(epoch from clock_timestamp())*1000));update public.saves set json=doc,updated_at=now() where user_id=uid;return to_jsonb(row);
 elsif action='market_buy' then return zone_hub_private.market_settle((args->>'id')::uuid,uid);
 elsif action='market_cancel' then
  select * into row from zone_hub_private.market_listings where id=(args->>'id')::uuid for update;if row.seller_id is distinct from uid then raise exception 'HUB_FORBIDDEN';end if;if row.status='cancelled' then return to_jsonb(row);end if;if row.status<>'active' then raise exception 'MARKET_GONE';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,824));perform 1 from public.saves where user_id=uid for update;doc:=zone_hub_private.document(uid);p:=doc->'profiles'->row.seller_profile;p:=zone_hub_private.change_item(p,row.item,1);if row.item like '%:st' then p:=jsonb_set(p,array['stk',row.item],to_jsonb(greatest(row.kills,coalesce((p->'stk'->>row.item)::bigint,0))));end if;
  doc:=jsonb_set(doc,array['profiles',row.seller_profile],p)||jsonb_build_object('zhEpoch',gen_random_uuid()::text,'ts',floor(extract(epoch from clock_timestamp())*1000));update public.saves set json=doc,updated_at=now() where user_id=uid;update zone_hub_private.market_listings set status='cancelled',closed_at=now() where id=row.id returning * into row;return to_jsonb(row);
 end if;raise exception 'HUB_ACTION';
end $$;
revoke all on function zone_hub_private.market_command(text,jsonb) from public,anon;
grant execute on function zone_hub_private.market_command(text,jsonb) to authenticated;
create or replace function public.zone_hub(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select case when action like 'market\_%' escape '\' then zone_hub_private.market_command(action,args) else zone_hub_private.community_command(action,args) end $$;
