-- Account-owned themes, backgrounds and avatar frames. Purchase costs are server-owned.
create table if not exists zone_hub_private.cosmetic_catalog(id text primary key,kind text not null check(kind in ('bundle','frame')),price integer not null check(price between 1 and 100000),title_pl text not null,title_en text not null,available boolean not null default true);
alter table zone_hub_private.cosmetic_catalog enable row level security;
revoke all on zone_hub_private.cosmetic_catalog from public,anon,authenticated;
insert into zone_hub_private.cosmetic_catalog(id,kind,price,title_pl,title_en) values
('halloween','bundle',500,'Po zmroku','After dark'),
('aurora','bundle',650,'Polarna zorza','Northern lights'),
('mirage','bundle',550,'Złoty Mirage','Golden Mirage'),
('nebula','bundle',700,'Mgławica','Nebula'),
('deep-ocean','bundle',600,'Błękitna głębia','Ocean depths'),
('sakura','bundle',550,'Ogród sakury','Sakura garden'),
('frame-halloween','frame',300,'Dyniowy strażnik','Pumpkin guardian'),
('frame-ember','frame',250,'Żar','Ember'),
('frame-aurora','frame',300,'Lodowy kryształ','Ice crystal'),
('frame-royal','frame',350,'Królewski laur','Royal laurel'),
('frame-neon','frame',300,'Neonowy obwód','Neon circuit'),
('frame-vines','frame',250,'Leśna straż','Forest guard')
on conflict(id) do update set kind=excluded.kind,price=excluded.price,title_pl=excluded.title_pl,title_en=excluded.title_en;
alter table zone_hub_private.cosmetics drop constraint if exists cosmetics_cosmetic_id_check;
alter table public.zh_profiles drop constraint if exists zh_profiles_profile_theme_check;
alter table public.zh_profiles add constraint zh_profiles_profile_theme_check check(profile_theme in ('violet','ocean','ember','forest','halloween','aurora','mirage','nebula','deep-ocean','sakura'));
alter table public.zh_profiles drop constraint if exists zh_profiles_launcher_theme_check;
alter table public.zh_profiles add constraint zh_profiles_launcher_theme_check check(launcher_theme in ('violet','ocean','ember','forest','halloween','aurora','mirage','nebula','deep-ocean','sakura'));
alter table public.zh_profiles add column if not exists profile_background text not null default 'auto';
alter table public.zh_profiles add column if not exists avatar_frame text not null default 'none';
create or replace function zone_hub_private.decorate_profile(value jsonb,viewer uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare target uuid:=(value->>'id')::uuid;p public.zh_profiles;state jsonb;badges jsonb;points integer;items jsonb;show jsonb;
begin
 select * into p from public.zh_profiles where user_id=target;
 if coalesce(value->'achievements','[]') ? 'br' then value:=value||jsonb_build_object('achievements',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements_text(value->'achievements') x where x<>'br'),'xp',greatest(0,coalesce((value->>'xp')::integer,0)-coalesce((select xp from public.zh_achievement_definitions where id='br' and game_id='strike-zone'),0)));end if;
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
 return value||jsonb_build_object('profile_theme',coalesce(p.profile_theme,'violet'),'profile_background',coalesce(p.profile_background,'auto'),'avatar_frame',coalesce(p.avatar_frame,'none'),'showcase',show,
  'achievementsByGame',jsonb_build_object('strike-zone',coalesce(value->'achievements','[]'),'zone-royale',badges),
  'achievements',coalesce(value->'achievements','[]')||badges,'xp',coalesce((value->>'xp')::integer,0)+points,
  'level',1+(coalesce((value->>'xp')::integer,0)+points)/250,'levelProgress',(coalesce((value->>'xp')::integer,0)+points)%250);
end $$;
revoke all on function zone_hub_private.decorate_profile(jsonb,uuid) from public,anon,authenticated;

create or replace function zone_hub_private.style_command(action text,args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();row zone_hub_private.cosmetic_catalog;doc jsonb;result jsonb;key text;choice text;kind text;catalog jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>(case when action='account_update' then 262144 else 8192 end) then raise exception 'HUB_INPUT';end if;
 if action='cosmetic_buy' then
  select * into row from zone_hub_private.cosmetic_catalog c where c.id=args->>'id' and c.available;
  if row.id is null then raise exception 'HUB_COSMETIC';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,821));
  perform 1 from public.saves where user_id=uid for update;
  if exists(select 1 from zone_hub_private.cosmetics c where c.user_id=uid and c.cosmetic_id=row.id) then return '{}';end if;
  doc:=zone_hub_private.document(uid);doc:=zone_hub_private.market_adjust(doc,doc->>'cur','strike-zone',-row.price);
  update public.saves set json=doc,updated_at=now() where user_id=uid;
  insert into zone_hub_private.cosmetics(user_id,cosmetic_id) values(uid,row.id);
  return '{}';
 elsif action='theme_apply' then
  if not(args ?| array['profile','launcher','background','frame']) then raise exception 'HUB_INPUT';end if;
  foreach key in array array['profile','launcher','background','frame'] loop
   if not(args ? key) then continue;end if;choice:=args->>key;
   if choice is null then raise exception 'HUB_COSMETIC';end if;
   if key in ('profile','launcher') and choice in ('violet','ocean','ember','forest') then continue;end if;
   if key='background' and choice='auto' or key='frame' and choice='none' then continue;end if;
   select c.kind into kind from zone_hub_private.cosmetic_catalog c where c.id=choice;
   if kind is null or kind<>(case when key='frame' then 'frame' else 'bundle' end) then raise exception 'HUB_COSMETIC';end if;
   if not exists(select 1 from zone_hub_private.cosmetics c where c.user_id=uid and c.cosmetic_id=choice) then raise exception 'HUB_COSMETIC_LOCKED';end if;
  end loop;
  insert into public.zh_profiles(user_id) values(uid) on conflict do nothing;
  update public.zh_profiles set profile_theme=coalesce(args->>'profile',profile_theme),launcher_theme=coalesce(args->>'launcher',launcher_theme),launcher_theme_set=launcher_theme_set or args ? 'launcher',profile_background=coalesce(args->>'background',profile_background),avatar_frame=coalesce(args->>'frame',avatar_frame) where user_id=uid;
  return '{}';
 end if;
 result:=zone_hub_private.account_command(action,args);
 if action='home' then
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'kind',c.kind,'price',c.price,'title_pl',c.title_pl,'title_en',c.title_en) order by c.kind,c.price,c.id),'[]') into catalog from zone_hub_private.cosmetic_catalog c where c.available;
  result:=jsonb_set(result,'{definitions}',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(result->'definitions') x where not(x->>'id'='br' and x->>'game_id'='strike-zone')));
  result:=jsonb_set(result,'{cosmetics}',coalesce(result->'cosmetics','{}')||jsonb_build_object('catalog',catalog,'friendFrames',coalesce((select jsonb_object_agg(f.friend_id::text,p.avatar_frame) from public.friends f join public.friends m on m.user_id=f.friend_id and m.friend_id=uid join public.zh_profiles p on p.user_id=f.friend_id where f.user_id=uid),'{}'::jsonb)));
 end if;
 return result;
end $$;
revoke all on function zone_hub_private.style_command(text,jsonb) from public,anon;
grant execute on function zone_hub_private.style_command(text,jsonb) to authenticated;
create or replace function public.zone_hub(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select zone_hub_private.style_command(action,args) $$;
