-- The existing pack catalog stays authoritative for purchases and past receipts.
-- Owners can publish or withdraw packs without removing historical catalog rows.
alter table zone_football_private.pack_catalog
  add column if not exists active boolean not null default true,
  add column if not exists revision integer not null default 1,
  add column if not exists require_revision boolean not null default false;

create or replace function zone_football_private.catalog_command(action text, args jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  uid uuid := auth.uid();
  is_admin boolean;
  item jsonb;
  pack_id text;
  pack_name text;
  pack_price integer;
  pack_count integer;
  odds jsonb;
  positions jsonb;
  current_revision integer;
  expected_revision integer;
  current_active boolean;
  clean jsonb;
  result jsonb;
  tier_index integer;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'HUB_LOGIN' using errcode='42501';
  end if;
  if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text) > 20000 then
    raise exception 'FOOTBALL_INPUT';
  end if;
  select exists(select 1 from public.sz_workshop_admins a where a.user_id=uid) into is_admin;
  if action = 'list' then
    if not exists(select 1 from public.zh_library l where l.user_id=uid and l.game_id='zone-football') then
      raise exception 'FOOTBALL_OWNERSHIP' using errcode='42501';
    end if;
    select coalesce(jsonb_agg(c.data || jsonb_build_object('revision', c.revision) order by (c.data->>'price')::integer,c.id),'[]'::jsonb)
      into result from zone_football_private.pack_catalog c where c.active;
    return jsonb_build_object('packs',result);
  end if;
  if not is_admin then raise exception 'FOOTBALL_CATALOG_ADMIN' using errcode='42501'; end if;
  if action = 'admin_list' then
    select coalesce(jsonb_agg(c.data || jsonb_build_object('revision',c.revision,'active',c.active) order by c.active desc,(c.data->>'price')::integer,c.id),'[]'::jsonb)
      into result from zone_football_private.pack_catalog c;
    return jsonb_build_object('packs',result);
  end if;
  if action not in ('save','withdraw') then raise exception 'FOOTBALL_INPUT'; end if;
  pack_id := case when action='save' then args->'pack'->>'id' else args->>'id' end;
  if pack_id is null or pack_id !~ '^[a-z0-9][a-z0-9-]{0,31}$' then raise exception 'FOOTBALL_PACK'; end if;
  if args ? 'expected_revision' then
    if coalesce(args->>'expected_revision','') !~ '^[0-9]{1,9}$' then raise exception 'FOOTBALL_INPUT'; end if;
    expected_revision := (args->>'expected_revision')::integer;
  end if;
  -- Serialize catalog edits, and hold the selected row until this transaction ends.
  perform pg_advisory_xact_lock(hashtextextended('zone-football-pack-catalog',0));
  select c.revision,c.active into current_revision,current_active from zone_football_private.pack_catalog c where c.id=pack_id for update;
  if current_revision is distinct from expected_revision then raise exception 'FOOTBALL_CATALOG_CHANGED'; end if;
  if action = 'withdraw' then
    if current_revision is null then raise exception 'FOOTBALL_PACK'; end if;
    update zone_football_private.pack_catalog set active=false,revision=revision+1,require_revision=true where id=pack_id;
    return jsonb_build_object('id',pack_id,'active',false,'revision',current_revision+1);
  end if;
  item := args->'pack';
  if jsonb_typeof(item) is distinct from 'object' then raise exception 'FOOTBALL_PACK'; end if;
  pack_name := btrim(item->>'name');
  if pack_name is null or char_length(pack_name) not between 1 and 36 or pack_name !~ '^[[:alnum:] .!?+–-]+$' then raise exception 'FOOTBALL_PACK_NAME'; end if;
  if coalesce(item->>'price','') !~ '^[0-9]{1,6}$' or coalesce(item->>'count','') !~ '^[0-9]$' then raise exception 'FOOTBALL_PACK'; end if;
  pack_price := (item->>'price')::integer; pack_count := (item->>'count')::integer;
  if pack_price not between 1 and 100000 or pack_count not between 1 and 9 then raise exception 'FOOTBALL_PACK'; end if;
  odds := item->'odds';
  if jsonb_typeof(odds) is distinct from 'array' or jsonb_array_length(odds) <> 4 then raise exception 'FOOTBALL_PACK_ODDS'; end if;
  if exists(select 1 from jsonb_array_elements_text(odds) x where x !~ '^[0-9]{1,3}$' or x::integer > 100)
     or (select sum(x::integer) from jsonb_array_elements_text(odds) x) <> 100 then raise exception 'FOOTBALL_PACK_ODDS'; end if;
  positions := item->'positions';
  if positions is not null then
    if jsonb_typeof(positions) is distinct from 'array' or jsonb_array_length(positions) not between 1 and 9 or
       exists(select 1 from jsonb_array_elements_text(positions) x where x not in ('GK','LB','CB','RB','CM','CAM','LW','ST','RW')) or
       (select count(distinct x) from jsonb_array_elements_text(positions) x) <> jsonb_array_length(positions) then raise exception 'FOOTBALL_POSITION'; end if;
  end if;
  for tier_index in 0..3 loop
    if (odds->>tier_index)::integer > 0 and not exists(
      select 1 from zone_football_private.players p
      where p.data->>'tier'=(array['bronze','silver','gold','elite'])[tier_index+1]
        and (positions is null or positions ? (p.data->>'position'))
    ) then raise exception 'FOOTBALL_PACK_EMPTY_TIER'; end if;
  end loop;
  clean := jsonb_build_object('id',pack_id,'name',pack_name,'price',pack_price,'count',pack_count,'odds',odds);
  if positions is not null then clean := clean || jsonb_build_object('positions',positions); end if;
  if current_revision is null then
    if (select count(*) from zone_football_private.pack_catalog) >= 100 then raise exception 'FOOTBALL_CATALOG_LIMIT'; end if;
    insert into zone_football_private.pack_catalog(id,data,active,revision,require_revision) values(pack_id,clean,true,1,true);
    current_revision := 1;
  else
    update zone_football_private.pack_catalog set data=clean,active=true,revision=revision+1,require_revision=true where id=pack_id;
    current_revision := current_revision+1;
  end if;
  return jsonb_build_object('pack',clean||jsonb_build_object('active',true,'revision',current_revision));
end;
$$;
revoke all on function zone_football_private.catalog_command(text,jsonb) from public,anon,authenticated;
grant execute on function zone_football_private.catalog_command(text,jsonb) to authenticated;

create or replace function zone_football_private.dynamic_command(action text,args jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid(); catalog_record record; nonce uuid; already_processed boolean:=false; result jsonb;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
  if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>20000 then raise exception 'FOOTBALL_INPUT';end if;
  if action='catalog' then return jsonb_build_object('pack_catalog',zone_football_private.catalog_command('list','{}')->'packs');end if;
  if action='buy_pack' and coalesce(args->>'nonce','') ~ '^[a-f0-9-]{36}$' then
    nonce:=(args->>'nonce')::uuid;
    select exists(select 1 from zone_football_private.orders o where o.user_id=uid and o.nonce=nonce)
        or exists(select 1 from zone_football_private.packs p where p.user_id=uid and p.nonce=nonce) into already_processed;
    if not already_processed then
      select c.revision,c.require_revision into catalog_record from zone_football_private.pack_catalog c where c.id=args->>'pack' and c.active for share;
      if not found then raise exception 'FOOTBALL_PACK'; end if;
      if (args ? 'expected_revision' and args->>'expected_revision' is distinct from catalog_record.revision::text)
         or (catalog_record.require_revision and not (args ? 'expected_revision')) then raise exception 'FOOTBALL_CATALOG_CHANGED'; end if;
    end if;
  end if;
  result:=zone_football_private.market_command(action,args);
  if action='state' then result:=result||jsonb_build_object('pack_catalog',zone_football_private.catalog_command('list','{}')->'packs');end if;
  return result;
end;
$$;
revoke all on function zone_football_private.dynamic_command(text,jsonb) from public,anon,authenticated;
grant execute on function zone_football_private.dynamic_command(text,jsonb) to authenticated;
revoke execute on function zone_football_private.market_command(text,jsonb) from public,anon,authenticated;

create or replace function public.zone_football(action text,args jsonb default '{}') returns jsonb
language sql security invoker set search_path = '' as $$ select zone_football_private.dynamic_command(action,args) $$;
revoke all on function public.zone_football(text,jsonb) from public,anon;
grant execute on function public.zone_football(text,jsonb) to authenticated;

create or replace function public.zone_football_catalog(action text,args jsonb default '{}') returns jsonb
language sql security invoker set search_path = '' as $$ select zone_football_private.catalog_command(action,args) $$;
revoke all on function public.zone_football_catalog(text,jsonb) from public,anon;
grant execute on function public.zone_football_catalog(text,jsonb) to authenticated;

