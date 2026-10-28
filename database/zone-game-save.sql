-- Merge only the active game's fields under a row lock. A stale Royale settings
-- screen cannot roll back Strike stats/settings (or the other way round).
create or replace function zone_hub_private.game_save(game_id text,doc jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();stored jsonb;merged jsonb;profiles jsonb;entry record;old jsonb;player jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if game_id is null or game_id not in ('strike-zone','zone-royale') or jsonb_typeof(doc) is distinct from 'object' or octet_length(doc::text)>4000000
  or jsonb_typeof(doc->'profiles') is distinct from 'object' or doc->'profiles'->(doc->>'cur') is null then raise exception 'HUB_SAVE_INPUT';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,821));
 select json into stored from public.saves where user_id=uid for update;
 if jsonb_typeof(stored)='string' then stored:=(stored#>>'{}')::jsonb;end if;
 stored:=coalesce(stored,jsonb_build_object('profiles','{}'::jsonb));
 if stored->>'zhEpoch' is not null and stored->>'zhEpoch' is distinct from doc->>'zhEpoch' then raise exception 'HUB_SAVE_STALE' using errcode='40001';end if;
 profiles:=coalesce(stored->'profiles','{}');
 for entry in select key,value from jsonb_each(doc->'profiles') loop
  if jsonb_typeof(entry.value)<>'object' then raise exception 'HUB_SAVE_INPUT';end if;
  old:=coalesce(profiles->entry.key,jsonb_build_object('name',entry.key,'wallet',500,'kills',0,'deaths',0,'matches',0,'wins',0,'skins','[]'::jsonb));
  if game_id='zone-royale' then player:=old||jsonb_build_object('royale',coalesce(entry.value->'royale','{}'));
  else player:=entry.value-'royale';if old ? 'royale' then player:=player||jsonb_build_object('royale',old->'royale');end if;end if;
  -- Hub identity edits win over a game that was already open during the edit.
  if stored ? 'identityEpoch' then player:=player||jsonb_build_object('name',old->'name','av',old->'av','avimg',old->'avimg');end if;
  profiles:=jsonb_set(profiles,array[entry.key],player);
 end loop;
 if game_id='zone-royale' then
  merged:=stored||jsonb_build_object('profiles',profiles,'cur',doc->'cur','royaleSt',coalesce(doc->'royaleSt','{}'));
 else
  merged:=(doc-'royaleSt')||jsonb_build_object('profiles',profiles);
  if stored ? 'royaleSt' then merged:=merged||jsonb_build_object('royaleSt',stored->'royaleSt');end if;
 end if;
 if stored ? 'identityEpoch' then merged:=merged||jsonb_build_object('identityEpoch',stored->'identityEpoch');end if;
 -- Keep the supplied inventory epoch: the existing trade trigger still rejects stale inventories.
 if doc ? 'zhEpoch' then merged:=merged||jsonb_build_object('zhEpoch',doc->'zhEpoch','zhMarket',coalesce(doc->'zhMarket','{}'));end if;
 merged:=merged||jsonb_build_object('ts',floor(extract(epoch from clock_timestamp())*1000));
 insert into public.saves(user_id,json,updated_at) values(uid,merged,now()) on conflict(user_id) do update set json=excluded.json,updated_at=excluded.updated_at;
 return merged;
end $$;
revoke all on function zone_hub_private.game_save(text,jsonb) from public,anon;
grant usage on schema zone_hub_private to authenticated;
grant execute on function zone_hub_private.game_save(text,jsonb) to authenticated;
create or replace function public.zone_game_save(game_id text,doc jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select zone_hub_private.game_save(game_id,doc) $$;
revoke all on function public.zone_game_save(text,jsonb) from public,anon;
grant execute on function public.zone_game_save(text,jsonb) to authenticated;
