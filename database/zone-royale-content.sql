-- Dedicated Royale inventory, retaining legacy BR outfits and parachutes.
create or replace function zone_hub_private.item_count(player jsonb,item text) returns integer language plpgsql security definer set search_path='' as $$
declare game text;box text;source jsonb;result integer;
begin select game_id,container into game,box from public.zh_item_definitions where id=item and tradable;if box is null then return 0;end if;
 if game='zone-royale' and box in ('cs','ks') then source:=case when player->'royale'->>'caseVersion'='1' then player->'royale'->case when box='cs' then 'cases' else 'keys' end else player->box end;return case when coalesce(source->>split_part(item,':',2),'') ~ '^[0-9]{1,8}$' then (source->>split_part(item,':',2))::integer else 0 end;end if;
 if game='zone-royale' then source:=case when player->'royale'->>'inventoryVersion'='2' then player->'royale'->'items' else coalesce(player->'royale'->'items','[]')||coalesce((select jsonb_agg(v) from jsonb_array_elements_text(coalesce(player->'br'->'items','[]'))v where v ~ '^[oc]:[0-8]$'),'[]') end;select count(*)::integer into result from jsonb_array_elements_text(coalesce(source,'[]'))v where v=item;return result;end if;
 if box in ('cs','ks') then return case when coalesce(player->box->>split_part(item,':',2),'') ~ '^[0-9]{1,8}$' then (player->box->>split_part(item,':',2))::integer else 0 end;end if;
 source:=case box when 'skins' then player->'skins' when 'br' then player->'br'->'items' else player->'agents'->'items' end;
 select count(*)::integer into result from jsonb_array_elements_text(case when jsonb_typeof(source)='array' then source else '[]' end) v where v=item;return result;
end $$;
revoke all on function zone_hub_private.item_count(jsonb,text) from public,anon,authenticated;

create or replace function zone_hub_private.change_item(player jsonb,item text,delta integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare game text;r jsonb;box text;route text[];arr jsonb;idx integer;k text;eq jsonb;owned boolean;
begin
 select game_id,container into game,box from public.zh_item_definitions where id=item and tradable;if box is null or delta not in (-1,1) then raise exception 'HUB_TRADE_ITEM';end if;
 if game='zone-royale' and box in ('cs','ks') then r:=coalesce(player->'royale','{}');if r->>'caseVersion' is distinct from '1' then r:=r||jsonb_build_object('caseVersion',1,'cases',jsonb_build_object('drop',coalesce(player->'cs'->'drop','0'),'supply',coalesce(player->'cs'->'supply','0')),'keys',jsonb_build_object('drop',coalesce(player->'ks'->'drop','0'),'supply',coalesce(player->'ks'->'supply','0')));end if;k:=split_part(item,':',2);idx:=zone_hub_private.item_count(player,item)+delta;if idx<0 then raise exception 'HUB_TRADE_ITEM';end if;r:=jsonb_set(r,array[case when box='cs' then 'cases' else 'keys' end,k],to_jsonb(idx));return jsonb_set(player,'{royale}',r);end if;
 if game='zone-royale' then
  r:=coalesce(player->'royale','{}');arr:=coalesce(r->'items','[]');if r->>'inventoryVersion' is distinct from '2' then arr:=arr||coalesce((select jsonb_agg(v) from jsonb_array_elements_text(coalesce(player->'br'->'items','[]'))v where v ~ '^[oc]:[0-8]$'),'[]');end if;
  if delta=1 then arr:=arr||to_jsonb(item);else select (ordinality-1)::integer into idx from jsonb_array_elements_text(arr) with ordinality where value=item limit 1;if idx is null then raise exception 'HUB_TRADE_ITEM';end if;arr:=arr-idx;end if;
  r:=r||jsonb_build_object('items',arr,'inventoryVersion',2);if not(arr ? item) then for k in select jsonb_object_keys(coalesce(r->'eq','{}'))loop if r->'eq'->>k=item then r:=r#-array['eq',k];end if;end loop;end if;return jsonb_set(player,'{royale}',r);
 end if;
 if box in ('cs','ks') then
  if jsonb_typeof(player->box)<>'object' or player->box is null then player:=jsonb_set(player,array[box],'{}');end if;
  k:=split_part(item,':',2);idx:=zone_hub_private.item_count(player,item)+delta;if idx<0 then raise exception 'HUB_TRADE_ITEM';end if;
  return jsonb_set(player,array[box,k],to_jsonb(idx));
 end if;
 if box in ('br','agents') and (player->box is null or jsonb_typeof(player->box)<>'object') then player:=jsonb_set(player,array[box],'{}');end if;
 route:=case box when 'skins' then array['skins'] when 'br' then array['br','items'] else array['agents','items'] end;
 arr:=case when jsonb_typeof(player#>route)='array' then player#>route else '[]' end;
 if delta=1 then arr:=arr||to_jsonb(item);else select (ordinality-1)::integer into idx from jsonb_array_elements_text(arr) with ordinality where value=item order by ordinality limit 1;if idx is null then raise exception 'HUB_TRADE_ITEM';end if;arr:=arr-idx;end if;
 player:=jsonb_set(player,route,arr);owned:=zone_hub_private.item_count(player,item)>0;
 if not owned then
  for k in select jsonb_object_keys(case when jsonb_typeof(player->'eq')='object' then player->'eq' else '{}' end) loop if player->'eq'->>k=item then player:=player#-array['eq',k];end if;end loop;
  for k in select jsonb_object_keys(case when jsonb_typeof(player->'eq2')='object' then player->'eq2' else '{}' end) loop if player->'eq2'->>k=item then player:=player#-array['eq2',k];end if;end loop;
  for k in select jsonb_object_keys(case when jsonb_typeof(player->'br'->'eq')='object' then player->'br'->'eq' else '{}' end) loop if player->'br'->'eq'->>k=item then player:=player#-array['br','eq',k];end if;end loop;
  for k in select jsonb_object_keys(case when jsonb_typeof(player->'agents'->'eq')='object' then player->'agents'->'eq' else '{}' end) loop if player->'agents'->'eq'->>k=item then player:=player#-array['agents','eq',k];end if;end loop;
  player:=player#-array['stk',item];
 elsif delta=1 and item like '%:st' and player->'stk'->item is null then
  if player->'stk' is null then player:=jsonb_set(player,'{stk}','{}');end if;player:=jsonb_set(player,array['stk',item],'0');
 end if;
 return player;
end $$;
revoke all on function zone_hub_private.change_item(jsonb,text,integer) from public,anon,authenticated;


insert into public.zh_item_definitions(id,title,category,container,rarity,tradable,game_id,market_price) values
('zr:wrap:0','Tidal Circuit','wrap','br',0,true,'zone-royale',500),
('zr:wrap:1','Emberline','wrap','br',0,true,'zone-royale',650),
('zr:wrap:2','Frost Pulse','wrap','br',1,true,'zone-royale',950),
('zr:wrap:3','Jungle Grid','wrap','br',1,true,'zone-royale',1200),
('zr:wrap:4','Starfall','wrap','br',2,true,'zone-royale',1800),
('zr:wrap:5','Coral Wave','wrap','br',2,true,'zone-royale',2400),
('zr:pick:0','Trailbreaker','pickaxe','br',0,true,'zone-royale',700),
('zr:pick:1','Tidal Cleaver','pickaxe','br',0,true,'zone-royale',1000),
('zr:pick:2','Frostbite','pickaxe','br',1,true,'zone-royale',1600),
('zr:pick:3','Solar Hammer','pickaxe','br',1,true,'zone-royale',2100),
('zr:pick:4','Rift Talon','pickaxe','br',2,true,'zone-royale',3200),
('zr:pick:5','Meteorite','pickaxe','br',2,true,'zone-royale',4200)
on conflict(id) do update set title=excluded.title,category=excluded.category,tradable=excluded.tradable,game_id=excluded.game_id,market_price=excluded.market_price;
create or replace function public.zh_protect_trade_inventory() returns trigger language plpgsql set search_path='' as $$
declare old_doc jsonb:=old.json;new_doc jsonb:=new.json;
begin
 if current_user in ('postgres','supabase_admin') then return new;end if;
 if jsonb_typeof(old_doc)='string' then old_doc:=(old_doc#>>'{}')::jsonb;end if;if jsonb_typeof(new_doc)='string' then new_doc:=(new_doc#>>'{}')::jsonb;end if;
 if old_doc->>'zhEpoch' is not null and coalesce(new_doc->>'zhEpoch','')<>old_doc->>'zhEpoch' or old_doc->'zhMarket' is not null and new_doc->'zhMarket' is distinct from old_doc->'zhMarket' then raise exception 'HUB_SAVE_STALE' using errcode='40001';end if;return new;
end $$;
