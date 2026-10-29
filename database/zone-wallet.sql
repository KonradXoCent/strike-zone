-- Account-wide virtual currency. Activate only through a wallet-aware client.
create schema if not exists zone_wallet_private;
revoke all on schema zone_wallet_private from public,anon;
grant usage on schema zone_wallet_private to authenticated;
create table if not exists zone_wallet_private.accounts(
 user_id uuid primary key references auth.users(id) on delete cascade,
 balance bigint not null default 0 check(balance between 0 and 9007199254740991),revision bigint not null default 1,
 play_seconds bigint not null default 0,rewarded_minutes bigint not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists zone_wallet_private.entries(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references zone_wallet_private.accounts(user_id) on delete cascade,
 delta bigint not null,reason text not null,reference text not null,game_id text,created_at timestamptz not null default now(),unique(user_id,reason,reference));
create index if not exists zone_wallet_entries_user_time on zone_wallet_private.entries(user_id,created_at desc);
create table if not exists zone_wallet_private.sessions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references zone_wallet_private.accounts(user_id) on delete cascade,
 game_id text not null check(game_id in ('strike-zone','zone-royale')),sequence bigint not null default 0,total bigint not null default 0,created_at timestamptz not null default now());
create index if not exists zone_wallet_sessions_user on zone_wallet_private.sessions(user_id,created_at desc);
alter table zone_wallet_private.accounts enable row level security;
alter table zone_wallet_private.entries enable row level security;
alter table zone_wallet_private.sessions enable row level security;
revoke all on all tables in schema zone_wallet_private from public,anon,authenticated;

-- Wallet writers take this short transaction lock before existing save/market locks.
-- Real-time match snapshots do not use this lock.
create or replace function zone_wallet_private.lock() returns void language sql set search_path='' as $$ select pg_catalog.pg_advisory_xact_lock(28003420) $$;
revoke all on function zone_wallet_private.lock() from public,anon,authenticated;
create or replace function zone_wallet_private.amount(value jsonb) returns bigint language plpgsql immutable set search_path='' as $$
begin if jsonb_typeof(value)<>'number' or value is null then return 0;end if;return greatest(0,least(9007199254740991,floor((value#>>'{}')::numeric)))::bigint;end $$;
revoke all on function zone_wallet_private.amount(jsonb) from public,anon,authenticated;
create or replace function zone_wallet_private.view(target uuid,history boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare row zone_wallet_private.accounts;result jsonb;
begin
 select * into row from zone_wallet_private.accounts where user_id=target;
 if row.user_id is null then return null;end if;
 result:=jsonb_build_object('schema',1,'currency','ZC','name','Zone Coins','balance',row.balance,'revision',row.revision,'play_seconds',row.play_seconds,'rate_per_minute',30);
 if history then result:=result||jsonb_build_object('history',coalesce((select jsonb_agg(to_jsonb(x)) from(select id,delta,reason,reference,game_id,created_at from zone_wallet_private.entries where user_id=target order by created_at desc,id desc limit 40)x),'[]'));end if;
 return result;
end $$;
revoke all on function zone_wallet_private.view(uuid,boolean) from public,anon,authenticated;
create or replace function zone_wallet_private.project(doc jsonb,target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare wallet jsonb:=zone_wallet_private.view(target);entry record;profiles jsonb:=coalesce(doc->'profiles','{}');p jsonb;
begin
 if wallet is null then return doc;end if;
 for entry in select key,value from jsonb_each(profiles) loop
  p:=entry.value||jsonb_build_object('wallet',wallet->'balance');
  p:=jsonb_set(p,'{royale}',coalesce(p->'royale','{}')||jsonb_build_object('wallet',wallet->'balance'));
  profiles:=jsonb_set(profiles,array[entry.key],p);
 end loop;
 return (doc-'walletCommit'-'walletAck')||jsonb_build_object('profiles',profiles,'zoneWallet',wallet,'ts',floor(extract(epoch from clock_timestamp())*1000));
end $$;
revoke all on function zone_wallet_private.project(jsonb,uuid) from public,anon,authenticated;
create or replace function zone_wallet_private.ensure(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare doc jsonb;entry record;balance numeric:=0;
begin
 perform zone_wallet_private.lock();
 if exists(select 1 from zone_wallet_private.accounts where user_id=target) then return zone_wallet_private.view(target);end if;
 select json into doc from public.saves where user_id=target for update;
 if jsonb_typeof(doc)='string' then doc:=(doc#>>'{}')::jsonb;end if;
 if doc is null then
  if target is distinct from auth.uid() then raise exception 'HUB_SAVE_REQUIRED';end if;
  perform zone_hub_private.account_command('home','{}');select json into doc from public.saves where user_id=target for update;
 end if;
 for entry in select value from jsonb_each(coalesce(doc->'profiles','{}')) loop
  balance:=balance+zone_wallet_private.amount(entry.value->'wallet')+zone_wallet_private.amount(entry.value->'royale'->'wallet');
 end loop;
 balance:=balance+coalesce((select sum(money) from haunt_private.results where user_id=target),0);
 if balance>9007199254740991 then raise exception 'WALLET_RANGE';end if;
 insert into zone_wallet_private.accounts(user_id,balance) values(target,balance::bigint);
 insert into zone_wallet_private.entries(user_id,delta,reason,reference) values(target,balance::bigint,'migration','v1');
 update public.saves set json=zone_wallet_private.project(doc,target),updated_at=now() where user_id=target;
 return zone_wallet_private.view(target);
end $$;
revoke all on function zone_wallet_private.ensure(uuid) from public,anon,authenticated;
create or replace function zone_wallet_private.change(target uuid,delta bigint,reason text,reference text,game text default null) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare row zone_wallet_private.accounts;
begin
 perform zone_wallet_private.lock();
 select * into row from zone_wallet_private.accounts where user_id=target for update;
 if row.user_id is null then raise exception 'WALLET_REQUIRED';end if;
 if exists(select 1 from zone_wallet_private.entries e where e.user_id=target and e.reason=reason and e.reference=reference) then return zone_wallet_private.view(target);end if;
 if row.balance+delta<0 then raise exception 'WALLET_FUNDS';end if;
 if row.balance::numeric+delta>9007199254740991 then raise exception 'WALLET_RANGE';end if;
 insert into zone_wallet_private.entries(user_id,delta,reason,reference,game_id) values(target,delta,reason,reference,game);
 update zone_wallet_private.accounts set balance=balance+delta,revision=revision+1,updated_at=now() where user_id=target;
 return zone_wallet_private.view(target);
end $$;
revoke all on function zone_wallet_private.change(uuid,bigint,text,text,text) from public,anon,authenticated;

-- The renderer supplies cumulative changes, not an absolute account balance.
-- A session belongs to one user/game; retries and old packets cannot reapply it.
-- Legacy games remain peer-authoritative for gameplay rewards, as before.
create or replace function zone_wallet_private.game_commit(target uuid,game text,request jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s zone_wallet_private.sessions;seq bigint;total bigint;
begin
 perform zone_wallet_private.lock();
 if jsonb_typeof(request)<>'object' or coalesce(request->>'session','')!~'^[a-f0-9-]{36}$' or coalesce(request->>'sequence','')!~'^[0-9]{1,15}$' or coalesce(request->>'total','')!~'^-?[0-9]{1,15}$' then raise exception 'WALLET_PROTOCOL';end if;
 select * into s from zone_wallet_private.sessions where id=(request->>'session')::uuid and user_id=target and game_id=game for update;
 if s.id is null then raise exception 'WALLET_SESSION' using errcode='42501';end if;
 seq:=(request->>'sequence')::bigint;total:=(request->>'total')::bigint;
 if seq<=s.sequence then return jsonb_build_object('session',s.id,'sequence',s.sequence,'total',s.total,'replayed',true);end if;
 if seq>s.sequence then
  if total<>s.total then perform zone_wallet_private.change(target,total-s.total,'game',s.id::text||':'||seq::text,game);end if;
  update zone_wallet_private.sessions set sequence=seq,total=total where id=s.id;s.sequence:=seq;s.total:=total;
 end if;
 return jsonb_build_object('session',s.id,'sequence',s.sequence,'total',s.total);
end $$;
revoke all on function zone_wallet_private.game_commit(uuid,text,jsonb) from public,anon,authenticated;
create or replace function zone_wallet_private.command(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();game text:=args->>'game_id';sid uuid;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>8192 then raise exception 'HUB_INPUT';end if;
 if action not in ('open','state') then raise exception 'HUB_ACTION' using errcode='42501';end if;
 perform zone_wallet_private.ensure(uid);
 if action='open' and game in ('strike-zone','zone-royale') then
  if game<>'strike-zone' and not exists(select 1 from public.zh_library where user_id=uid and game_id=game) then raise exception 'HUB_LIBRARY';end if;
  insert into zone_wallet_private.sessions(user_id,game_id) values(uid,game) returning id into sid;
 end if;
 return zone_wallet_private.view(uid,action='state')||case when sid is null then '{}'::jsonb else jsonb_build_object('session',sid,'sequence',0,'total',0) end;
end $$;
revoke all on function zone_wallet_private.command(text,jsonb) from public,anon;
grant execute on function zone_wallet_private.command(text,jsonb) to authenticated;
create or replace function public.zone_wallet(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select zone_wallet_private.command(action,args) $$;
revoke all on function public.zone_wallet(text,jsonb) from public,anon;
grant execute on function public.zone_wallet(text,jsonb) to authenticated;

create or replace function zone_hub_private.wallet_adjust_doc(target uuid,doc jsonb,pkey text,game text,delta bigint,reason text,reference text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from zone_wallet_private.accounts where user_id=target) then return zone_hub_private.market_adjust(doc,pkey,game,delta);end if;
 doc:=zone_wallet_private.project(doc,target);
 perform zone_wallet_private.change(target,delta,reason,reference,game);
 return zone_wallet_private.project(zone_hub_private.market_adjust(doc,pkey,game,delta),target);
end $$;
revoke all on function zone_hub_private.wallet_adjust_doc(uuid,jsonb,text,text,bigint,text,text) from public,anon,authenticated;

create or replace function zone_wallet_private.protect_save() returns trigger language plpgsql security definer set search_path='' as $$
declare doc jsonb:=new.json;prior jsonb;entry record;balance bigint;
begin
 select a.balance into balance from zone_wallet_private.accounts a where a.user_id=new.user_id;
 if not found then return new;end if;
 if jsonb_typeof(doc)='string' then doc:=(doc#>>'{}')::jsonb;end if;
 if tg_op='UPDATE' then prior:=old.json;if jsonb_typeof(prior)='string' then prior:=(prior#>>'{}')::jsonb;end if;end if;
 for entry in select key,value from jsonb_each(coalesce(doc->'profiles','{}')) loop
  if entry.value->'wallet' is distinct from to_jsonb(balance) and entry.value->'wallet' is distinct from prior->'profiles'->entry.key->'wallet' then raise exception 'WALLET_UPDATE_REQUIRED';end if;
  if entry.value->'royale' ? 'wallet' and entry.value->'royale'->'wallet' is distinct from to_jsonb(balance) and entry.value->'royale'->'wallet' is distinct from prior->'profiles'->entry.key->'royale'->'wallet' then raise exception 'WALLET_UPDATE_REQUIRED';end if;
 end loop;
 new.json:=zone_wallet_private.project(doc,new.user_id);return new;
end $$;
revoke all on function zone_wallet_private.protect_save() from public,anon,authenticated;
do $$ begin if not exists(select 1 from pg_catalog.pg_trigger where tgname='zone_wallet_save_projection' and tgrelid='public.saves'::regclass) then create trigger zone_wallet_save_projection before insert or update on public.saves for each row execute function zone_wallet_private.protect_save();end if;end $$;

create or replace function zone_wallet_private.haunt_reward() returns trigger language plpgsql security definer set search_path='' as $$
declare doc jsonb;
begin
 if new.money>0 and exists(select 1 from zone_wallet_private.accounts where user_id=new.user_id) then
  perform zone_wallet_private.change(new.user_id,new.money,'haunt_result',new.room_id::text,'zone-haunt');
  select json into doc from public.saves where user_id=new.user_id for update;
  update public.saves set json=zone_wallet_private.project(doc,new.user_id),updated_at=now() where user_id=new.user_id;
 end if;return new;
end $$;
revoke all on function zone_wallet_private.haunt_reward() from public,anon,authenticated;
do $$ begin if not exists(select 1 from pg_catalog.pg_trigger where tgname='zone_wallet_haunt_reward' and tgrelid='haunt_private.results'::regclass) then create trigger zone_wallet_haunt_reward after insert on haunt_private.results for each row execute function zone_wallet_private.haunt_reward();end if;end $$;

create or replace function zone_hub_private.wallet_hub_command(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
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
    perform zone_wallet_private.change(uid,(minutes-account.rewarded_minutes)*30,'playtime',minutes::text,(select game_id from zone_hub_private.play_sessions where id=(args->>'id')::uuid and user_id=uid));
    update zone_wallet_private.accounts set rewarded_minutes=minutes where user_id=uid;
    select json into doc from public.saves where user_id=uid for update;
    update public.saves set json=zone_wallet_private.project(doc,uid),updated_at=now() where user_id=uid;
   end if;
  end if;
  if action='home' then result:=result||jsonb_build_object('wallet',zone_wallet_private.view(uid,true));result:=jsonb_set(result,'{cosmetics}',coalesce(result->'cosmetics','{}')||jsonb_build_object('balance',zone_wallet_private.view(uid)->'balance','currency','ZC'));end if;
  if action='market_list' then result:=result||jsonb_build_object('wallet',zone_wallet_private.view(uid)->'balance','currency','ZC');end if;
 end if;return result;
end $$;
revoke all on function zone_hub_private.wallet_hub_command(text,jsonb) from public,anon;
grant execute on function zone_hub_private.wallet_hub_command(text,jsonb) to authenticated;
create or replace function public.zone_hub(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select zone_hub_private.wallet_hub_command(action,args) $$;

-- Merge only the active game's fields under a row lock. A stale Royale settings
-- screen cannot roll back Strike stats/settings (or the other way round).
create or replace function zone_hub_private.game_save(game_id text,doc jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();stored jsonb;merged jsonb;profiles jsonb;entry record;old jsonb;player jsonb;wallet_ack jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if game_id is null or game_id not in ('strike-zone','zone-royale') or jsonb_typeof(doc) is distinct from 'object' or octet_length(doc::text)>4000000
  or jsonb_typeof(doc->'profiles') is distinct from 'object' or doc->'profiles'->(doc->>'cur') is null then raise exception 'HUB_SAVE_INPUT';end if;
 perform zone_wallet_private.lock();
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,821));
 select json into stored from public.saves where user_id=uid for update;
 if jsonb_typeof(stored)='string' then stored:=(stored#>>'{}')::jsonb;end if;
 stored:=coalesce(stored,jsonb_build_object('profiles','{}'::jsonb));
 if stored->>'zhEpoch' is not null and stored->>'zhEpoch' is distinct from doc->>'zhEpoch' then raise exception 'HUB_SAVE_STALE' using errcode='40001';end if;
 if exists(select 1 from zone_wallet_private.accounts where user_id=uid) then
  wallet_ack:=zone_wallet_private.game_commit(uid,game_id,doc->'walletCommit');
  if wallet_ack->>'replayed'='true' then return stored||jsonb_build_object('zoneWallet',zone_wallet_private.view(uid),'walletAck',wallet_ack);end if;
  doc:=zone_wallet_private.project(doc,uid);
 end if;
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
 if wallet_ack is not null then merged:=zone_wallet_private.project(merged,uid);end if;
 insert into public.saves(user_id,json,updated_at) values(uid,merged,now()) on conflict(user_id) do update set json=excluded.json,updated_at=excluded.updated_at;
 return merged||case when wallet_ack is null then '{}'::jsonb else jsonb_build_object('walletAck',wallet_ack) end;
end $$;

-- Adapt the existing atomic purchase functions in place, retaining their
-- inventory checks, receipts and compatibility for accounts not yet migrated.
create or replace function zone_wallet_private.patch(signature text,needle text,replacement text,add_lock boolean default false) returns void language plpgsql set search_path='' as $$
declare oid regprocedure:=to_regprocedure(signature);definition text;
begin
 if oid is null then return;end if;
 definition:=pg_get_functiondef(oid);
 if needle<>'' then
  if position(needle in definition)>0 then definition:=replace(definition,needle,replacement);
  elsif position(replacement in definition)=0 then raise exception 'WALLET_PATCH_SOURCE: %',signature;end if;
 end if;
 if add_lock and position('perform zone_wallet_private.lock();' in definition)=0 then definition:=regexp_replace(definition,E'\nbegin\n',E'\nbegin\n perform zone_wallet_private.lock();\n');end if;
 execute definition;
end $$;
revoke all on function zone_wallet_private.patch(text,text,text,boolean) from public,anon,authenticated;
select zone_wallet_private.patch('zone_hub_private.market_settle(uuid,uuid)',
 'zone_hub_private.market_adjust(doc,pkey,row.game_id,-row.price)',
 'zone_hub_private.wallet_adjust_doc(buyer,doc,pkey,row.game_id,-row.price,''market_buy'',row.id::text)',true);
select zone_wallet_private.patch('zone_hub_private.market_settle(uuid,uuid)',
 'zone_hub_private.market_adjust(other,row.seller_profile,row.game_id,row.price)',
 'zone_hub_private.wallet_adjust_doc(row.seller_id,other,row.seller_profile,row.game_id,row.price,''market_sale'',row.id::text)',false);
select zone_wallet_private.patch('zone_hub_private.market_bot_tick()','','',true);
select zone_wallet_private.patch('zone_hub_private.style_command(text,jsonb)',
 'zone_hub_private.market_adjust(doc,doc->>''cur'',''strike-zone'',-row.price)',
 'zone_hub_private.wallet_adjust_doc(uid,doc,doc->>''cur'',''strike-zone'',-row.price,''cosmetic'',row.id)',true);
select zone_wallet_private.patch('zone_hub_private.account_command(text,jsonb)',
 'zone_hub_private.market_adjust(doc,doc->>''cur'',''strike-zone'',-500)',
 'zone_hub_private.wallet_adjust_doc(uid,doc,doc->>''cur'',''strike-zone'',-500,''cosmetic'',''halloween'')',true);
select zone_wallet_private.patch('sz_bonus_private.redeem(text,text,bigint)',
 'profile:=jsonb_set(profile,''{wallet}'',to_jsonb(balance+c.reward_amount));',
 'saved:=zone_hub_private.wallet_adjust_doc(uid,saved,profile_name,''strike-zone'',c.reward_amount,''bonus_code'',c.id::text);profile:=saved->''profiles''->profile_name;',true);
select zone_wallet_private.patch('sz_workshop_private.case_buy(uuid,text,bigint)',
 'saved:=jsonb_set(jsonb_set(saved,array[''profiles'',profile_name,''wallet''],to_jsonb(balance-2500)),array[''ts''],to_jsonb(stamp));',
 'saved:=zone_hub_private.wallet_adjust_doc(uid,saved,profile_name,''strike-zone'',-2500,''community_case'',request_id::text);saved:=jsonb_set(saved,''{ts}'',to_jsonb(stamp));',true);

insert into zone_hub_private.cosmetic_catalog(id,kind,price,title_pl,title_en) values
('frame-dragon','frame',650,'Smoczy ogień','Dragonfire'),('frame-circuit','frame',400,'Impuls cyfrowy','Digital pulse'),
('frame-frost','frame',450,'Mroźna korona','Frost crown'),('frame-samurai','frame',550,'Karmazynowy ronin','Crimson ronin'),
('frame-starlight','frame',500,'Gwiezdny szlak','Starlight'),('frame-spectral','frame',500,'Widmowy strażnik','Spectral guardian')
on conflict(id) do update set price=excluded.price,title_pl=excluded.title_pl,title_en=excluded.title_en;

notify pgrst,'reload schema';
