-- Catalog origin is independent from shared account ownership. Legacy BR
-- outfits remain usable; new Royale pass items live in profile.royale only.
alter table public.zh_item_definitions add column if not exists game_id text not null default 'strike-zone' references public.zh_games(id);
create index if not exists zh_items_game on public.zh_item_definitions(game_id);
update public.zh_item_definitions set game_id='zone-royale' where id ~ '^(o|c):[0-9]+$' or id in ('case:drop','key:drop','case:supply','key:supply');
insert into public.zh_item_definitions(id,title,category,container,rarity,tradable,game_id) values
 ('o:1000','Drift Runner outfit','br','br',1,false,'zone-royale'),
 ('c:1000','Tidal Wing parachute','br','br',1,false,'zone-royale'),
 ('o:1001','Storm Scout outfit','br','br',2,false,'zone-royale'),
 ('c:1001','Afterglow parachute','br','br',2,false,'zone-royale'),
 ('o:1002','Solar Warden outfit','br','br',3,false,'zone-royale'),
 ('c:1002','Eclipse parachute','br','br',3,false,'zone-royale'),
 ('o:1003','Nightfall outfit','br','br',3,false,'zone-royale'),
 ('c:1003','Solar Sail parachute','br','br',3,false,'zone-royale')
on conflict(id) do update set title=excluded.title,category=excluded.category,rarity=excluded.rarity,tradable=excluded.tradable,game_id=excluded.game_id;
create or replace function zone_hub_private.inventory(uid uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare doc jsonb;player jsonb;items jsonb;
begin
 begin doc:=zone_hub_private.document(uid);exception when others then return '[]';end;
 player:=doc->'profiles'->(doc->>'cur');
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'game_id',d.game_id,'title',d.title,'category',d.category,'rarity',d.rarity,'tradable',d.tradable,'count',c.n,'kills',case when d.id like '%:st' then coalesce(player->'stk'->d.id,'0') else '0'::jsonb end) order by d.game_id,d.category,d.title),'[]') into items
 from public.zh_item_definitions d cross join lateral (select case when d.game_id='zone-royale' and not d.tradable then
  (select count(*)::integer from jsonb_array_elements_text(case when jsonb_typeof(player->'royale'->'items')='array' then player->'royale'->'items' else '[]' end) v where v=d.id)
  else zone_hub_private.item_count(player,d.id) end n) c where c.n>0;
 items:=items||coalesce((select jsonb_agg(jsonb_build_object('id','forge:'||s.id,'game_id','strike-zone','title',s.payload->>'name','weapon',s.payload->>'weapon','category','community','count',1,'tradable',false,'stattrak',s.stattrak)) from public.sz_workshop_owned_skins s where s.user_id=uid),'[]');
 return items;
end $$;
revoke all on function zone_hub_private.inventory(uuid) from public,anon,authenticated;
