-- Official identity is server-controlled and remains attached to the same account
-- after a nickname change. The existing Workshop owner allowlist identifies ZeroX.
create table if not exists zone_hub_private.official_accounts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table zone_hub_private.official_accounts enable row level security;
revoke all on zone_hub_private.official_accounts from public,anon,authenticated;
insert into zone_hub_private.official_accounts(user_id)
 select a.user_id from public.sz_workshop_admins a join public.leaderboard l using(user_id)
 where lower(l.name)='zerox' on conflict do nothing;
create index if not exists zh_market_active_price on zone_hub_private.market_listings(game_id,price,id) where status='active';
create index if not exists zh_market_active_newest on zone_hub_private.market_listings(game_id,created_at desc,id) where status='active';

create or replace function zone_hub_private.browse_command(action text,args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();doc jsonb;rows jsonb;total bigint;page integer;sort text;v_category text;search text;game text;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args)<>'object' or octet_length(args::text)>8192 then raise exception 'HUB_INPUT';end if;
 if action='market_list' then
  doc:=zone_hub_private.market_command(action,args);
  -- Older game clients keep their existing response until they request pagination.
  if not(args ? 'page') then return doc;end if;
  if coalesce(args->>'page','')!~'^[0-9]{1,6}$' then raise exception 'HUB_INPUT';end if;
  page:=greatest(1,(args->>'page')::integer);sort:=coalesce(args->>'sort','price_asc');v_category:=left(coalesce(args->>'category','all'),32);search:=left(coalesce(args->>'search',''),80);game:=args->>'game_id';
  if sort not in ('price_asc','price_desc','newest','oldest','name') then raise exception 'HUB_INPUT';end if;
  select count(*) into total from zone_hub_private.market_listings l join public.zh_item_definitions d on d.id=l.item where l.status='active' and l.game_id=game and (v_category='all' or d.category=v_category) and (search='' or d.title ilike '%'||search||'%');
  page:=least(page,greatest(1,ceil(total/24.0)::integer));
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows from(
   select l.id,l.item,l.game_id,l.price,l.kills,l.created_at,d.title,d.category,d.rarity,l.seller_id=uid as mine,l.seller_id is null as bot,coalesce(l.bot_name,n.name,'Player') as seller_name
   from zone_hub_private.market_listings l join public.zh_item_definitions d on d.id=l.item left join public.leaderboard n on n.user_id=l.seller_id
   where l.status='active' and l.game_id=game and (v_category='all' or d.category=v_category) and (search='' or d.title ilike '%'||search||'%')
   order by case when sort='price_asc' then l.price end asc,case when sort='price_desc' then l.price end desc,
    case when sort='newest' then l.created_at end desc,case when sort='oldest' then l.created_at end asc,case when sort='name' then d.title end asc,l.id
   limit 24 offset (page-1)*24
  ) x;
  return doc||jsonb_build_object('listings',rows,'total',total,'page',page,'pages',greatest(1,ceil(total/24.0)::integer),'page_size',24,'sort',sort,'category',v_category);
 end if;
 if action like 'market\_%' escape '\' then return zone_hub_private.market_command(action,args);end if;
 doc:=zone_hub_private.community_command(action,args);
 if action in ('profile','home') and doc->'profile' is not null then
  doc:=jsonb_set(doc,'{profile,creator_verified}',to_jsonb(exists(select 1 from zone_hub_private.official_accounts a where a.user_id=(doc->'profile'->>'id')::uuid)));
 elsif action='search' and jsonb_typeof(doc)='array' then
  select coalesce(jsonb_agg(v||jsonb_build_object('creator_verified',exists(select 1 from zone_hub_private.official_accounts a where a.user_id=(v->>'id')::uuid))),'[]') into doc from jsonb_array_elements(doc) v;
 end if;
 return doc;
end $$;
revoke all on function zone_hub_private.browse_command(text,jsonb) from public,anon;
grant execute on function zone_hub_private.browse_command(text,jsonb) to authenticated;
create or replace function public.zone_hub(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select zone_hub_private.browse_command(action,args) $$;
