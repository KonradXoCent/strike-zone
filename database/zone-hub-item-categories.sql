-- Normalize legacy firearm metadata so market and inventory filters agree.
-- Ownership, prices, containers and tradeability do not change.
update public.zh_item_definitions set category=case
 when split_part(id,':',1)=any(array['glock','usp','p250','deagle','elite','fiveseven','tec9','cz75','r8']) then 'pistol'
 when split_part(id,':',1)=any(array['ak','m4','galil','famas','sg553','aug']) then 'rifle'
 when split_part(id,':',1)=any(array['nova','xm1014','mag7','sawed']) then 'shotgun'
 when split_part(id,':',1)=any(array['m249','negev']) then 'heavy'
 else category end
where game_id='strike-zone' and category in ('weapon','smg','sniper','pistol','rifle','shotgun','heavy');
