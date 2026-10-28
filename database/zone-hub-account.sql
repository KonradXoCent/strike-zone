-- Paid cosmetics and public showcases are account-owned, independent of local preferences.
alter table public.zh_profiles add column if not exists profile_theme text not null default 'violet' check(profile_theme in ('violet','ocean','ember','forest','halloween'));
alter table public.zh_profiles add column if not exists launcher_theme text not null default 'violet' check(launcher_theme in ('violet','ocean','ember','forest','halloween'));
alter table public.zh_profiles add column if not exists showcase jsonb not null default '{"kind":"items","items":[]}';
create table if not exists zone_hub_private.cosmetics(
 user_id uuid not null references auth.users(id) on delete cascade,
 cosmetic_id text not null check(cosmetic_id in ('halloween')),purchased_at timestamptz not null default now(),
 primary key(user_id,cosmetic_id)
);
alter table zone_hub_private.cosmetics enable row level security;
revoke all on zone_hub_private.cosmetics from public,anon,authenticated;

create or replace function zone_hub_private.decorate_profile(value jsonb,viewer uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare target uuid:=(value->>'id')::uuid;p public.zh_profiles;state jsonb;badges jsonb;points integer;items jsonb;show jsonb;
begin
 select * into p from public.zh_profiles where user_id=target;
 select r.state into state from zone_royale_private.progression r where r.user_id=target;
 badges:=zone_royale_private.badges(coalesce(state,'{}'));
 select coalesce(sum(d.xp),0)::integer into points from public.zh_achievement_definitions d where d.game_id='zone-royale' and badges ? d.id;
 show:=coalesce(p.showcase,'{"kind":"items","items":[]}');
 if show->>'kind'='items' then
  if zone_hub_private.can_view(target,viewer,'inventory') then
   items:=zone_hub_private.inventory(target);
   show:=show||jsonb_build_object('items',coalesce((select jsonb_agg(i) from jsonb_array_elements(items) i where exists(select 1 from jsonb_array_elements(coalesce(show->'items','[]')) s where s->>'id'=i->>'id' and s->>'game_id'=i->>'game_id')),'[]'));
  else show:=jsonb_build_object('kind','items','items','[]'::jsonb,'private',true);end if;
 end if;
 return value||jsonb_build_object('profile_theme',coalesce(p.profile_theme,'violet'),'showcase',show,
  'achievementsByGame',jsonb_build_object('strike-zone',coalesce(value->'achievements','[]'),'zone-royale',badges),
  'achievements',coalesce(value->'achievements','[]')||badges,'xp',coalesce((value->>'xp')::integer,0)+points,
  'level',1+(coalesce((value->>'xp')::integer,0)+points)/250,'levelProgress',(coalesce((value->>'xp')::integer,0)+points)%250);
end $$;
revoke all on function zone_hub_private.decorate_profile(jsonb,uuid) from public,anon,authenticated;

create or replace function zone_hub_private.account_command(action text,args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();doc jsonb;p jsonb;result jsonb;name text;image text;theme text;selected jsonb;owned jsonb;balance bigint;wanted jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>(case when action='account_update' then 262144 else 8192 end) then raise exception 'HUB_INPUT';end if;
 if action='account_update' then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,821));
  perform 1 from public.saves where user_id=uid for update;
  begin doc:=zone_hub_private.document(uid);exception when others then
   select l.name into name from public.leaderboard l where l.user_id=uid;name:=coalesce(name,'Player');
   doc:=jsonb_build_object('cur',name,'profiles',jsonb_build_object(name,jsonb_build_object('name',name,'wallet',500,'cases',1,'keys',1,'skins','[]'::jsonb,'kills',0,'deaths',0,'wins',0,'matches',0)));
   insert into public.saves(user_id,json,updated_at) values(uid,doc,now()) on conflict(user_id) do nothing;
  end;p:=doc->'profiles'->(doc->>'cur');
  name:=case when args ? 'name' then btrim(args->>'name') else p->>'name' end;
  if name is null or length(name) not between 2 and 14 or name ~ '[<>"&[:cntrl:]]' then raise exception 'HUB_NICKNAME';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(name),824));
  if exists(select 1 from public.leaderboard l where lower(l.name)=lower(name) and l.user_id<>uid) then raise exception 'HUB_NICKNAME_TAKEN';end if;
  image:=case when args ? 'image' then args->>'image' else p->>'avimg' end;
  if image is not null and (length(image)>200000 or image !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$') then raise exception 'HUB_AVATAR';end if;
  p:=p||jsonb_build_object('name',name,'avimg',image);
  doc:=jsonb_set(doc,array['profiles',doc->>'cur'],p)||jsonb_build_object('identityEpoch',gen_random_uuid()::text,'ts',floor(extract(epoch from clock_timestamp())*1000));
  update public.saves set json=doc,updated_at=now() where user_id=uid;
  insert into public.leaderboard(user_id,name,avimg) values(uid,name,image) on conflict(user_id) do update set name=excluded.name,avimg=excluded.avimg;
  return '{}'::jsonb;
 elsif action='cosmetic_buy' then
  if args->>'id' is distinct from 'halloween' then raise exception 'HUB_COSMETIC';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,821));
  perform 1 from public.saves where user_id=uid for update;
  if exists(select 1 from zone_hub_private.cosmetics where user_id=uid and cosmetic_id='halloween') then return '{}'::jsonb;end if;
  doc:=zone_hub_private.document(uid);doc:=zone_hub_private.market_adjust(doc,doc->>'cur','strike-zone',-500);
  update public.saves set json=doc,updated_at=now() where user_id=uid;
  insert into zone_hub_private.cosmetics(user_id,cosmetic_id) values(uid,'halloween');
  return '{}'::jsonb;
 elsif action='theme_apply' then
  if not(args ? 'profile' or args ? 'launcher') then raise exception 'HUB_INPUT';end if;
  foreach name in array array['profile','launcher'] loop
   if not(args ? name) then continue;end if;theme:=args->>name;
   if theme is null or theme not in ('violet','ocean','ember','forest','halloween') then raise exception 'HUB_COSMETIC';end if;
   if theme='halloween' and not exists(select 1 from zone_hub_private.cosmetics where user_id=uid and cosmetic_id=theme) then raise exception 'HUB_COSMETIC_LOCKED';end if;
  end loop;
  insert into public.zh_profiles(user_id) values(uid) on conflict do nothing;
  update public.zh_profiles set profile_theme=coalesce(args->>'profile',profile_theme),launcher_theme=coalesce(args->>'launcher',launcher_theme) where user_id=uid;return '{}'::jsonb;
 elsif action='showcase_save' then
  if args->>'kind'='game' then
   if not exists(select 1 from public.zh_library where user_id=uid and game_id=args->>'game_id') then raise exception 'HUB_LIBRARY';end if;
   selected:=jsonb_build_object('kind','game','game_id',args->>'game_id');
  elsif args->>'kind'='items' then
   if jsonb_typeof(args->'items') is distinct from 'array' or jsonb_array_length(args->'items')>6 then raise exception 'HUB_SHOWCASE';end if;
   owned:=zone_hub_private.inventory(uid);
   if (select count(distinct (x->>'game_id',x->>'id')) from jsonb_array_elements(args->'items') x)<>jsonb_array_length(args->'items')
    or exists(select 1 from jsonb_array_elements(args->'items') x where not exists(select 1 from jsonb_array_elements(owned) i where i->>'id'=x->>'id' and i->>'game_id'=x->>'game_id' and (i->>'count')::integer>0)) then raise exception 'HUB_SHOWCASE';end if;
   selected:=jsonb_build_object('kind','items','items',(select coalesce(jsonb_agg(jsonb_build_object('game_id',x->>'game_id','id',x->>'id')),'[]') from jsonb_array_elements(args->'items') x));
  else raise exception 'HUB_SHOWCASE';end if;
  insert into public.zh_profiles(user_id,showcase) values(uid,selected) on conflict(user_id) do update set showcase=excluded.showcase;return '{}'::jsonb;
 elsif action='edit_profile' then
  -- Existing command validates Strike badges. Validate the complete game-scoped set first.
  wanted:=args->'pinned';
  if jsonb_typeof(wanted) is distinct from 'array' or jsonb_array_length(wanted)>3 then raise exception 'HUB_BADGE';end if;
  result:=zone_hub_private.decorate_profile(zone_hub_private.profile(uid,uid),uid);
  if exists(select 1 from jsonb_array_elements_text(wanted) x where not(result->'achievements' ? x)) then raise exception 'HUB_BADGE';end if;
  args:=args||jsonb_build_object('pinned',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements_text(wanted) x where x not like 'zr-%'));
  result:=zone_hub_private.browse_command(action,args);
  update public.zh_profiles set pinned=array(select distinct jsonb_array_elements_text(wanted)) where user_id=uid;return result;
 end if;
 result:=zone_hub_private.browse_command(action,args);
 if action in ('home','profile') and result->'profile' is not null then result:=jsonb_set(result,'{profile}',zone_hub_private.decorate_profile(result->'profile',uid));end if;
 if action='home' then
  select coalesce(jsonb_agg(cosmetic_id),'[]') into owned from zone_hub_private.cosmetics where user_id=uid;
  select coalesce(launcher_theme,'violet') into theme from public.zh_profiles where user_id=uid;
  begin doc:=zone_hub_private.document(uid);exception when others then doc:='{}';end;p:=doc->'profiles'->(doc->>'cur');balance:=coalesce((p->>'wallet')::bigint,0);
  result:=result||jsonb_build_object('cosmetics',jsonb_build_object('owned',owned,'launcher',coalesce(theme,'violet'),'balance',balance,'currency','strike-zone'));
 end if;
 return result;
end $$;
revoke all on function zone_hub_private.account_command(text,jsonb) from public,anon;
grant execute on function zone_hub_private.account_command(text,jsonb) to authenticated;
create or replace function public.zone_hub(action text,args jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select zone_hub_private.account_command(action,args) $$;
