-- More distinct bot listings; the existing purchase budget and rate stay enforced.
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
    select 'Zone Supply Bot',d.id,d.game_id,greatest(1,round(d.market_price*(1.08+random()*.15))::integer) from public.zh_item_definitions d where d.game_id=game and d.tradable and d.category not in ('case','key','community') and d.id not like '%:st' and not exists(select 1 from zone_hub_private.market_listings active where active.item=d.id and active.game_id=game and active.status='active' and active.seller_id is null) order by random() limit greatest(0,48-(select count(*) from zone_hub_private.market_listings l where l.seller_id is null and l.game_id=game and l.status='active'));
  end loop;state.last_stock:=now();
 end if;
 update zone_hub_private.market_bots set day=state.day,spent=state.spent,last_tick=now(),last_stock=state.last_stock where id=true;
 return jsonb_build_object('purchases',bought,'spent_today',state.spent);
end $$;
revoke all on function zone_hub_private.market_bot_tick() from public,anon,authenticated;


update zone_hub_private.market_bots set last_stock=null;
