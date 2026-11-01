-- Change future playtime rewards without rewriting balances or receipts.
CREATE OR REPLACE FUNCTION zone_wallet_private.view(target uuid, history boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare row zone_wallet_private.accounts;result jsonb;
begin
 select * into row from zone_wallet_private.accounts where user_id=target;
 if row.user_id is null then return null;end if;
 result:=jsonb_build_object('schema',1,'currency','ZC','name','Zone Coins','balance',row.balance,'revision',row.revision,'play_seconds',row.play_seconds,'rate_per_minute',5);
 if history then result:=result||jsonb_build_object('history',coalesce((select jsonb_agg(to_jsonb(x)) from(select id,delta,reason,reference,game_id,created_at from zone_wallet_private.entries where user_id=target order by created_at desc,id desc limit 40)x),'[]'));end if;
 return result;
end $function$
;

CREATE OR REPLACE FUNCTION zone_hub_private.wallet_hub_command(action text, args jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();result jsonb;old_seconds bigint;new_seconds bigint;account zone_wallet_private.accounts;minutes bigint;doc jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if args->>'walletProtocol'='1' or exists(select 1 from zone_wallet_private.accounts where user_id=uid) then
  perform zone_wallet_private.lock();
  if args->>'walletProtocol'='1' then perform zone_wallet_private.ensure(uid);end if;
  if action in ('play_tick','play_end') then select coalesce(sum(seconds_played),0) into old_seconds from public.zh_library where user_id=uid;end if;
 end if;
 result:=zone_hub_private.haunt_hub_command(action,args-'walletProtocol');
 if exists(select 1 from zone_wallet_private.accounts where user_id=uid) then
  if action in ('play_tick','play_end') then
   select coalesce(sum(seconds_played),0) into new_seconds from public.zh_library where user_id=uid;
   update zone_wallet_private.accounts set play_seconds=play_seconds+greatest(0,new_seconds-coalesce(old_seconds,new_seconds)) where user_id=uid returning * into account;
   minutes:=account.play_seconds/60;
   if minutes>account.rewarded_minutes then
    perform zone_wallet_private.change(uid,(minutes-account.rewarded_minutes)*5,'playtime',minutes::text,(select game_id from zone_hub_private.play_sessions where id=(args->>'id')::uuid and user_id=uid));
    update zone_wallet_private.accounts set rewarded_minutes=minutes where user_id=uid;
    select json into doc from public.saves where user_id=uid for update;
    update public.saves set json=zone_wallet_private.project(doc,uid),updated_at=now() where user_id=uid;
   end if;
  end if;
  if action='home' then result:=result||jsonb_build_object('wallet',zone_wallet_private.view(uid,true));result:=jsonb_set(result,'{cosmetics}',coalesce(result->'cosmetics','{}')||jsonb_build_object('balance',zone_wallet_private.view(uid)->'balance','currency','ZC'));end if;
  if action='market_list' then result:=result||jsonb_build_object('wallet',zone_wallet_private.view(uid)->'balance','currency','ZC');end if;
 end if;return result;
end $function$
;

-- Account-owned bundles keep existing purchases and their prices.
insert into zone_hub_private.cosmetic_catalog(id,kind,price,title_pl,title_en) values
('stadium','bundle',450,'Wieczór na stadionie','Stadium night'),
('cyberpunk','bundle',600,'Neonowe miasto','Neon city'),
('winter','bundle',500,'Zimowa cisza','Winter hush')
on conflict(id) do nothing;
alter table public.zh_profiles drop constraint if exists zh_profiles_profile_theme_check;
alter table public.zh_profiles add constraint zh_profiles_profile_theme_check check(profile_theme in ('violet','ocean','ember','forest','halloween','aurora','mirage','nebula','deep-ocean','sakura','stadium','cyberpunk','winter'));
alter table public.zh_profiles drop constraint if exists zh_profiles_launcher_theme_check;
alter table public.zh_profiles add constraint zh_profiles_launcher_theme_check check(launcher_theme in ('violet','ocean','ember','forest','halloween','aurora','mirage','nebula','deep-ocean','sakura','stadium','cyberpunk','winter'));
update public.zh_games set package_config=coalesce(package_config,'{}')||'{"version":"0.3.2"}'::jsonb where id='zone-football';
