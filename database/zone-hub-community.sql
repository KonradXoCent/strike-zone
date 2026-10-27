create index if not exists zh_library_game on public.zh_library(game_id);
create index if not exists zh_sessions_game on zone_hub_private.play_sessions(game_id);
alter table public.zh_profiles add column profile_visibility text not null default 'public' check(profile_visibility in ('public','friends','private'));
alter table public.zh_profiles add column inventory_visibility text not null default 'private' check(inventory_visibility in ('public','friends','private'));
create table public.zh_item_definitions(id text primary key,title text not null,category text not null,container text not null check(container in ('skins','br','agents','cs','ks')),rarity integer not null,tradable boolean not null default true);
alter table public.zh_item_definitions enable row level security;
revoke all on public.zh_item_definitions from public,anon,authenticated;
grant select on public.zh_item_definitions to authenticated;
create policy zh_items_read on public.zh_item_definitions for select to authenticated using(true);
create table zone_hub_private.presence(id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,expires_at timestamptz not null);
create index zh_presence_user on zone_hub_private.presence(user_id,expires_at);
alter table zone_hub_private.presence enable row level security;
create table public.zh_trades(
 id uuid primary key default gen_random_uuid(),sender_id uuid not null references auth.users(id),recipient_id uuid not null references auth.users(id),
 sender_item text references public.zh_item_definitions(id),recipient_item text references public.zh_item_definitions(id),
 sender_profile text not null,recipient_profile text not null,
 sender_ready boolean not null default false,recipient_ready boolean not null default false,
 revision integer not null default 1,status text not null default 'pending' check(status in ('pending','completed','cancelled','expired')),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '15 minutes',check(sender_id<>recipient_id)
);
create index zh_trades_sender_item on public.zh_trades(sender_item);
create index zh_trades_recipient_item on public.zh_trades(recipient_item);
create index zh_trades_sender_time on public.zh_trades(sender_id,created_at desc);
create index zh_trades_recipient_time on public.zh_trades(recipient_id,created_at desc);
alter table public.zh_trades enable row level security;
revoke all on public.zh_trades from public,anon,authenticated;
grant select on public.zh_trades to authenticated;
create policy zh_trades_participants on public.zh_trades for select to authenticated using((select auth.uid()) in (sender_id,recipient_id));

create function zone_hub_private.can_view(target uuid,viewer uuid,scope text) returns boolean
language sql stable security definer set search_path='' as $$
 select target=viewer or coalesce((select case when scope='inventory' then inventory_visibility else profile_visibility end from public.zh_profiles where user_id=target),case when scope='inventory' then 'private' else 'public' end)='public'
 or (select case when scope='inventory' then inventory_visibility else profile_visibility end from public.zh_profiles where user_id=target)='friends' and exists(select 1 from public.friends where user_id=target and friend_id=viewer) and exists(select 1 from public.friends where user_id=viewer and friend_id=target)
$$;
revoke all on function zone_hub_private.can_view(uuid,uuid,text) from public,anon;
grant execute on function zone_hub_private.can_view(uuid,uuid,text) to authenticated;
drop policy zh_profiles_read on public.zh_profiles;
create policy zh_profiles_read on public.zh_profiles for select to authenticated using(zone_hub_private.can_view(user_id,(select auth.uid()),'profile'));
drop policy zh_comments_read on public.zh_profile_comments;
create policy zh_comments_read on public.zh_profile_comments for select to authenticated using(zone_hub_private.can_view(profile_id,(select auth.uid()),'profile'));

create function zone_hub_private.document(uid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare doc jsonb;
begin select json into doc from public.saves where user_id=uid;
 if jsonb_typeof(doc)='string' then doc:=(doc#>>'{}')::jsonb; end if;
 if doc is null or jsonb_typeof(doc->'profiles') is distinct from 'object' or doc->'profiles'->(doc->>'cur') is null then raise exception 'HUB_SAVE_REQUIRED'; end if;
 return doc;
end $$;
revoke all on function zone_hub_private.document(uuid) from public,anon,authenticated;

create function zone_hub_private.item_count(player jsonb,item text) returns integer language plpgsql security definer set search_path='' as $$
declare box text;source jsonb;result integer;
begin select container into box from public.zh_item_definitions where id=item and tradable;if box is null then return 0;end if;
 if box in ('cs','ks') then return case when coalesce(player->box->>split_part(item,':',2),'') ~ '^[0-9]{1,8}$' then (player->box->>split_part(item,':',2))::integer else 0 end;end if;
 source:=case box when 'skins' then player->'skins' when 'br' then player->'br'->'items' else player->'agents'->'items' end;
 select count(*)::integer into result from jsonb_array_elements_text(case when jsonb_typeof(source)='array' then source else '[]' end) v where v=item;return result;
end $$;
revoke all on function zone_hub_private.item_count(jsonb,text) from public,anon,authenticated;

create function zone_hub_private.inventory(uid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare doc jsonb;player jsonb;items jsonb;
begin
 begin doc:=zone_hub_private.document(uid);exception when others then return '[]';end;
 player:=doc->'profiles'->(doc->>'cur');
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'count',zone_hub_private.item_count(player,d.id),'kills',case when d.id like '%:st' then coalesce(player->'stk'->d.id,'0') else '0'::jsonb end) order by d.category,d.title),'[]') into items from public.zh_item_definitions d where zone_hub_private.item_count(player,d.id)>0;
 -- Workshop instances have separate proven ownership and are shown without
 -- exposing the save document, wallet, account details or private editor drafts.
 items:=items||coalesce((select jsonb_agg(jsonb_build_object('id','forge:'||s.id,'title',s.payload->>'name','weapon',s.payload->>'weapon','category','community','count',1,'tradable',false,'stattrak',s.stattrak)) from public.sz_workshop_owned_skins s where s.user_id=uid),'[]');
 return items;
end $$;
revoke all on function zone_hub_private.inventory(uuid) from public,anon,authenticated;

create function zone_hub_private.change_item(player jsonb,item text,delta integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare box text;route text[];arr jsonb;idx integer;k text;eq jsonb;owned boolean;
begin
 select container into box from public.zh_item_definitions where id=item and tradable;if box is null or delta not in (-1,1) then raise exception 'HUB_TRADE_ITEM';end if;
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

-- Only accounts that complete a platform trade acquire an epoch. Older clients
-- keep working for all other players; a stale snapshot cannot restore traded items.
create function public.zh_protect_trade_inventory() returns trigger language plpgsql set search_path='' as $$
declare old_doc jsonb:=old.json;new_doc jsonb:=new.json;
begin
 if current_user in ('postgres','supabase_admin') then return new;end if;
 if jsonb_typeof(old_doc)='string' then old_doc:=(old_doc#>>'{}')::jsonb;end if;
 if jsonb_typeof(new_doc)='string' then new_doc:=(new_doc#>>'{}')::jsonb;end if;
 if old_doc->>'zhEpoch' is not null and coalesce(new_doc->>'zhEpoch','')<>old_doc->>'zhEpoch' then raise exception 'HUB_SAVE_STALE' using errcode='40001';end if;
 return new;
end $$;
revoke all on function public.zh_protect_trade_inventory() from public,anon,authenticated;
create trigger zh_saves_epoch before update on public.saves for each row execute function public.zh_protect_trade_inventory();

create function zone_hub_private.community_command(action text,args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();target uuid;result jsonb;doc jsonb;other jsonb;p jsonb;q jsonb;tr public.zh_trades;sid uuid;item text;profile_vis text;inventory_vis text;first_user uuid;second_user uuid;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args)<>'object' or octet_length(args::text)>8192 then raise exception 'HUB_INPUT';end if;
 if action='home' then
  result:=zone_hub_private.command(action,args);return jsonb_set(result,'{profile}',result->'profile'||(select jsonb_build_object('profile_visibility',profile_visibility,'inventory_visibility',inventory_visibility) from public.zh_profiles where user_id=uid));
 elsif action in ('profile','inventory') then
  target:=coalesce((args->>'id')::uuid,uid);
  if not coalesce(zone_hub_private.can_view(target,uid,'profile'),false) then raise exception 'HUB_PROFILE_PRIVATE';end if;
  if action='inventory' then if not coalesce(zone_hub_private.can_view(target,uid,'inventory'),false) then raise exception 'HUB_INVENTORY_PRIVATE';end if;return zone_hub_private.inventory(target);end if;
  result:=zone_hub_private.command(action,args);return jsonb_set(result,'{profile}',result->'profile'||coalesce((select jsonb_build_object('profile_visibility',profile_visibility,'inventory_visibility',inventory_visibility) from public.zh_profiles where user_id=target),'{}')||jsonb_build_object('canViewInventory',coalesce(zone_hub_private.can_view(target,uid,'inventory'),false)));
 elsif action='search' then
  result:=zone_hub_private.command(action,args);return coalesce((select jsonb_agg(v) from jsonb_array_elements(result) v where coalesce(zone_hub_private.can_view((v->>'id')::uuid,uid,'profile'),false)),'[]');
 elsif action='edit_profile' then
  select coalesce(args->>'profile_visibility',profile_visibility),coalesce(args->>'inventory_visibility',inventory_visibility) into profile_vis,inventory_vis from public.zh_profiles where user_id=uid;
  profile_vis:=coalesce(profile_vis,'public');inventory_vis:=coalesce(inventory_vis,'private');if profile_vis not in ('public','friends','private') or inventory_vis not in ('public','friends','private') then raise exception 'HUB_INPUT';end if;
  result:=zone_hub_private.command(action,args);update public.zh_profiles set profile_visibility=profile_vis,inventory_visibility=inventory_vis where user_id=uid;return result;
 elsif action='comment' then
  if not coalesce(zone_hub_private.can_view((args->>'id')::uuid,uid,'profile'),false) then raise exception 'HUB_PROFILE_PRIVATE';end if;return zone_hub_private.command(action,args);
 elsif action='presence' then
  sid:=(args->>'id')::uuid;if sid is null then raise exception 'HUB_INPUT';end if;
  delete from zone_hub_private.presence where expires_at<now()-interval '1 day';
  if exists(select 1 from zone_hub_private.presence where id=sid and user_id<>uid) then raise exception 'HUB_FORBIDDEN';end if;
  if (select count(*) from zone_hub_private.presence where user_id=uid and expires_at>now())>=8 and not exists(select 1 from zone_hub_private.presence where id=sid) then raise exception 'HUB_RATE';end if;
  insert into zone_hub_private.presence(id,user_id,expires_at) values(sid,uid,now()+interval '55 seconds') on conflict(id) do update set expires_at=excluded.expires_at;return '{}';
 elsif action='presence_end' then delete from zone_hub_private.presence where id=(args->>'id')::uuid and user_id=uid;return '{}';
 elsif action='trade_list' then
  update public.zh_trades set status='expired' where uid in (sender_id,recipient_id) and status='pending' and expires_at<now();
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select offer.*,coalesce(a.name,'Player') sender_name,coalesce(b.name,'Player') recipient_name from public.zh_trades offer left join public.leaderboard a on a.user_id=offer.sender_id left join public.leaderboard b on b.user_id=offer.recipient_id where uid in (offer.sender_id,offer.recipient_id) order by offer.created_at desc limit 50) x),'[]');
 elsif action='trade_create' then
  target:=(args->>'id')::uuid;if target is null or target=uid or not exists(select 1 from public.friends where user_id=uid and friend_id=target) or not exists(select 1 from public.friends where user_id=target and friend_id=uid) then raise exception 'HUB_TRADE_FRIEND';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,823));
  if not exists(select 1 from zone_hub_private.presence where user_id=target and expires_at>now()) or not exists(select 1 from zone_hub_private.presence where user_id=uid and expires_at>now()) then raise exception 'HUB_TRADE_OFFLINE';end if;
  if (select count(*) from public.zh_trades where sender_id=uid and created_at>now()-interval '1 hour')>=30 or (select count(*) from public.zh_trades where sender_id=uid and status='pending' and expires_at>now())>=10 then raise exception 'HUB_RATE';end if;
  doc:=zone_hub_private.document(uid);other:=zone_hub_private.document(target);item:=args->>'item';if zone_hub_private.item_count(doc->'profiles'->(doc->>'cur'),item)<1 then raise exception 'HUB_TRADE_ITEM';end if;
  insert into public.zh_trades(sender_id,recipient_id,sender_item,sender_profile,recipient_profile) values(uid,target,item,doc->>'cur',other->>'cur') returning * into tr;return to_jsonb(tr);
 elsif action in ('trade_pick','trade_confirm','trade_cancel') then
  select * into tr from public.zh_trades where id=(args->>'id')::uuid for update;if not found or uid not in (tr.sender_id,tr.recipient_id) then raise exception 'HUB_FORBIDDEN' using errcode='42501';end if;
  if tr.status='completed' and action='trade_confirm' then return to_jsonb(tr);end if;
  if tr.status<>'pending' or tr.expires_at<now() then raise exception 'HUB_TRADE_EXPIRED';end if;
  if action='trade_cancel' then update public.zh_trades set status='cancelled',revision=revision+1 where id=tr.id returning * into tr;return to_jsonb(tr);end if;
  if coalesce((args->>'revision')::integer,0)<>tr.revision then raise exception 'HUB_TRADE_CHANGED';end if;
  if not exists(select 1 from zone_hub_private.presence where user_id=tr.sender_id and expires_at>now()) or not exists(select 1 from zone_hub_private.presence where user_id=tr.recipient_id and expires_at>now()) then raise exception 'HUB_TRADE_OFFLINE';end if;
  if action='trade_pick' then
   doc:=zone_hub_private.document(uid);item:=args->>'item';if zone_hub_private.item_count(doc->'profiles'->(doc->>'cur'),item)<1 then raise exception 'HUB_TRADE_ITEM';end if;
   update public.zh_trades set sender_item=case when uid=sender_id then item else sender_item end,recipient_item=case when uid=recipient_id then item else recipient_item end,sender_profile=case when uid=sender_id then doc->>'cur' else sender_profile end,recipient_profile=case when uid=recipient_id then doc->>'cur' else recipient_profile end,sender_ready=false,recipient_ready=false,revision=revision+1 where id=tr.id returning * into tr;return to_jsonb(tr);
  end if;
  if tr.sender_item is null or tr.recipient_item is null then raise exception 'HUB_TRADE_INCOMPLETE';end if;
  first_user:=least(tr.sender_id,tr.recipient_id);second_user:=greatest(tr.sender_id,tr.recipient_id);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(first_user::text,824));perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(second_user::text,824));
  perform 1 from public.saves where user_id in (first_user,second_user) order by user_id for update;
  doc:=zone_hub_private.document(tr.sender_id);other:=zone_hub_private.document(tr.recipient_id);p:=doc->'profiles'->tr.sender_profile;q:=other->'profiles'->tr.recipient_profile;
  if doc->>'cur'<>tr.sender_profile or other->>'cur'<>tr.recipient_profile or zone_hub_private.item_count(p,tr.sender_item)<1 or zone_hub_private.item_count(q,tr.recipient_item)<1 then raise exception 'HUB_TRADE_ITEM';end if;
  update public.zh_trades set sender_ready=sender_ready or uid=sender_id,recipient_ready=recipient_ready or uid=recipient_id where id=tr.id returning * into tr;
  if tr.sender_ready and tr.recipient_ready then
   p:=zone_hub_private.change_item(zone_hub_private.change_item(p,tr.sender_item,-1),tr.recipient_item,1);q:=zone_hub_private.change_item(zone_hub_private.change_item(q,tr.recipient_item,-1),tr.sender_item,1);
   doc:=jsonb_set(doc,array['profiles',tr.sender_profile],p)||jsonb_build_object('zhEpoch',gen_random_uuid()::text,'ts',floor(extract(epoch from clock_timestamp())*1000));
   other:=jsonb_set(other,array['profiles',tr.recipient_profile],q)||jsonb_build_object('zhEpoch',gen_random_uuid()::text,'ts',floor(extract(epoch from clock_timestamp())*1000));
   update public.saves set json=doc,updated_at=now() where user_id=tr.sender_id;update public.saves set json=other,updated_at=now() where user_id=tr.recipient_id;
   update public.zh_trades set status='completed',revision=revision+1 where id=tr.id returning * into tr;
  end if;return to_jsonb(tr);
 end if;
 return zone_hub_private.command(action,args);
end $$;
revoke all on function zone_hub_private.command(text,jsonb) from authenticated;
revoke all on function zone_hub_private.community_command(text,jsonb) from public,anon;
grant execute on function zone_hub_private.community_command(text,jsonb) to authenticated;
create or replace function public.zone_hub(action text,args jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select zone_hub_private.community_command(action,args) $$;
