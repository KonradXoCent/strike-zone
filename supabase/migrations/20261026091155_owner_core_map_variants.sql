-- Native-geometry copies of owner maps. Original maps and their revisions
-- stay independent. Creating the registry row and revision 1 is atomic.
create table public.sz_core_map_variants (
 map_id integer primary key check (map_id between 100 and 999),
 map_key text not null unique check (map_key='core-'||map_id::text||'-owner'),
 source_key text not null check (source_key ~ '^core-[0-9]{1,2}-[a-z0-9-]{1,45}$'),
 source_base text not null check (source_base ~ '^[0-9a-f]{8}$'),
 name text not null check (char_length(name) between 3 and 48 and name=btrim(name) and name ~ '^[[:alnum:] _().-]+$'),
 modes text[] not null check (cardinality(modes) between 1 and 24 and array_position(modes,null) is null),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 request_id uuid not null unique,
 request_hash text not null check (request_hash ~ '^[0-9a-f]{32}$'),
 constraint core_variant_head foreign key(map_key) references public.sz_core_maps(map_key) deferrable initially deferred
);
create unique index sz_core_map_variant_name_idx on public.sz_core_map_variants(lower(name));
create index sz_core_map_variants_created_by_idx on public.sz_core_map_variants(created_by);
alter table public.sz_core_map_variants enable row level security;
revoke all on public.sz_core_map_variants from public,anon,authenticated;
grant select on public.sz_core_map_variants to anon,authenticated;
grant insert on public.sz_core_map_variants to authenticated;
grant all on public.sz_core_map_variants to service_role;
create policy core_variants_public_read on public.sz_core_map_variants for select to anon,authenticated using(true);
create policy core_variants_owner_insert on public.sz_core_map_variants for insert to authenticated
 with check (created_by=(select auth.uid()) and exists(select 1 from public.sz_core_map_owners where user_id=(select auth.uid())));

create function public.sz_core_map_create_variant(p_source_key text,p_name text,p_modes text[],p_document jsonb,p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $function$
declare
 uid uuid:=auth.uid(); title text:=btrim(p_name); selected text[]; new_id integer; new_key text;
 definition public.sz_core_map_variants; head jsonb; document jsonb; signature text;
 catalog constant jsonb := '{"core-0-dust-ii":{"name":"Dust II","modes":["classic","retake","dm","snipers","deagle","pistols","shotguns","knife","ctf","tdm","coop","gungame"]},"core-1-ancient":{"name":"Ancient","modes":["classic","retake","dm","snipers","deagle","pistols","shotguns","knife","ctf","tdm","coop","gungame"]},"core-2-mirage":{"name":"Mirage","modes":["classic","retake","dm","snipers","deagle","pistols","shotguns","knife","ctf","tdm","coop","gungame"]},"core-3-inferno":{"name":"Inferno","modes":["classic","retake","dm","snipers","deagle","pistols","shotguns","knife","ctf","tdm","coop","gungame"]},"core-4-overpass":{"name":"Overpass","modes":["classic","retake","dm","snipers","deagle","pistols","shotguns","knife","ctf","tdm","coop","gungame"]},"core-5-nuke":{"name":"Nuke","modes":["classic","retake","dm","snipers","deagle","pistols","shotguns","knife","ctf","tdm","coop","gungame"]},"core-6-storm-island":{"name":"Storm Island","modes":["br"]},"core-7-frost-peaks":{"name":"Frost Peaks","modes":["br"]},"core-8-metro-city":{"name":"Metro City","modes":["br"]},"core-9-dead-mall":{"name":"Dead Mall","modes":["zombie"]},"core-10-outbreak-lab":{"name":"Outbreak Lab","modes":["zombie"]},"core-11-rotten-village":{"name":"Rotten Village","modes":["zombie"]},"core-12-de-aztec":{"name":"de_aztec","modes":["classic","retake","dm","snipers","deagle","pistols","shotguns","knife","ctf","tdm","coop","gungame"]},"core-13-de-anubis":{"name":"de_anubis","modes":["classic","retake","dm","snipers","deagle","pistols","shotguns","knife","ctf","tdm","coop","gungame"]},"core-14-hs-warehouse":{"name":"hs_warehouse","modes":["prophunt"]},"core-15-hs-garden":{"name":"hs_garden","modes":["prophunt"]},"core-16-hs-motel":{"name":"hs_motel","modes":["prophunt"]},"core-17-mg-dodgeyard":{"name":"mg_dodgeyard","modes":["minigames"]},"core-18-mg-bombtag":{"name":"mg_bombtag","modes":["minigames"]},"core-19-mg-snowfield":{"name":"mg_snowfield","modes":["minigames"]},"core-20-mg-stadium":{"name":"mg_stadium","modes":["minigames","football"]},"core-21-zm-hallows-end":{"name":"zm_hallows_end","modes":["zombie"]},"core-22-dom-forest-outpost":{"name":"dom_forest_outpost","modes":["domination"]},"core-23-dom-desert-ruins":{"name":"dom_desert_ruins","modes":["domination"]},"core-24-dom-freight-yard":{"name":"dom_freight_yard","modes":["domination"]},"core-25-heist-city-bank":{"name":"heist_city_bank","modes":["heist"]},"core-26-heist-harbor":{"name":"heist_harbor","modes":["heist"]},"core-27-heist-sand-fort":{"name":"heist_sand_fort","modes":["heist"]},"core-28-survival-frozen-station":{"name":"survival_frozen_station","modes":["survival"]},"core-29-survival-reactor":{"name":"survival_reactor","modes":["survival"]},"core-30-survival-swamp-camp":{"name":"survival_swamp_camp","modes":["survival"]},"core-31-laser-neon-core":{"name":"laser_neon_core","modes":["laser"]},"core-32-laser-desert-relay":{"name":"laser_desert_relay","modes":["laser"]},"core-33-laser-frost-grid":{"name":"laser_frost_grid","modes":["laser"]}}'::jsonb;
begin
 if uid is null or not exists(select 1 from public.sz_core_map_owners where user_id=uid) then
  raise exception 'CORE_MAP_OWNER_REQUIRED' using errcode='42501';
 end if;
 if p_request_id is null or p_source_key is null or not (catalog ? p_source_key) or
    title is null or char_length(title)<3 or char_length(title)>48 or title !~ '^[[:alnum:] _().-]+$' or
    p_modes is null or cardinality(p_modes)<1 or cardinality(p_modes)>24 or array_position(p_modes,null) is not null or
    jsonb_typeof(p_document) is distinct from 'object' or p_document->>'key' is distinct from p_source_key then
  raise exception 'CORE_MAP_VARIANT_INVALID';
 end if;
 if exists(select 1 from unnest(p_modes) m where not ((catalog->p_source_key->'modes') ? m)) then
  raise exception 'CORE_MAP_MODES_INVALID';
 end if;
 select array_agg(distinct m order by m) into selected from unnest(p_modes) m;
 signature:=md5(jsonb_build_object('source',p_source_key,'name',title,'modes',selected,'document',p_document)::text);
 -- Reuse completed requests after a lost response; no duplicate maps or IDs.
 perform pg_advisory_xact_lock(hashtextextended('sz-core-map-variants',0));
 select * into definition from public.sz_core_map_variants where request_id=p_request_id;
 if found then
  if definition.created_by<>uid or definition.request_hash<>signature then raise exception 'CORE_MAP_REQUEST_CHANGED'; end if;
  select to_jsonb(m) into head from public.sz_core_maps m where m.map_key=definition.map_key;
  return jsonb_build_object('definition',to_jsonb(definition)-'request_hash'-'request_id','head',head);
 end if;
 if exists(select 1 from public.sz_core_map_variants where lower(name)=lower(title)) or
    exists(select 1 from jsonb_each(catalog) c where lower(c.value->>'name')=lower(title)) then
  raise exception 'CORE_MAP_NAME_TAKEN';
 end if;
 select n into new_id from generate_series(100,999) n where
  not exists(select 1 from public.sz_core_map_variants where map_id=n) and
  not exists(select 1 from public.sz_core_maps where map_key='core-'||n::text||'-owner') order by n limit 1;
 if new_id is null then raise exception 'CORE_MAP_VARIANT_LIMIT'; end if;
 new_key:='core-'||new_id::text||'-owner';
 document:=jsonb_set(p_document,'{key}',to_jsonb(new_key));
 insert into public.sz_core_map_variants(map_id,map_key,source_key,source_base,name,modes,created_by,request_id,request_hash)
 values(new_id,new_key,p_source_key,document->>'base',title,selected,uid,p_request_id,signature) returning * into definition;
 head:=public.sz_core_map_publish(new_key,0,document);
 return jsonb_build_object('definition',to_jsonb(definition)-'request_hash'-'request_id','head',head);
end;
$function$;
revoke all on function public.sz_core_map_create_variant(text,text,text[],jsonb,uuid) from public,anon;
grant execute on function public.sz_core_map_create_variant(text,text,text[],jsonb,uuid) to authenticated;

-- Publish notifications for public map data only. Existing publications stay intact.
do $publication$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sz_core_maps') then
   alter publication supabase_realtime add table public.sz_core_maps;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sz_core_map_variants') then
   alter publication supabase_realtime add table public.sz_core_map_variants;
  end if;
 end if;
end;
$publication$;
