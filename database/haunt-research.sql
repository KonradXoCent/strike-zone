-- Equipment-only Research Points. Apply after haunt-progression.sql.
-- Stored integers remain exact; K/M/B/T abbreviations are presentation only.
select zone_wallet_private.lock();
alter table haunt_private.results add column if not exists currency text not null default 'ZC' check(currency in ('ZC','RP'));
alter table haunt_private.results alter column currency set default 'RP';
alter table haunt_private.gear_orders add column if not exists currency text not null default 'ZC' check(currency in ('ZC','RP'));
alter table haunt_private.gear_orders alter column currency set default 'RP';
create table if not exists haunt_private.research_accounts(user_id uuid primary key references auth.users(id) on delete cascade,balance bigint not null default 1000 check(balance between 0 and 9007199254740991),revision bigint not null default 1,created_at timestamptz not null default now());
create table if not exists haunt_private.research_entries(id uuid primary key default gen_random_uuid(),user_id uuid not null references haunt_private.research_accounts(user_id) on delete cascade,delta bigint not null,kind text not null check(kind in ('starter','contract','gear')),reference text not null,created_at timestamptz not null default now(),unique(user_id,kind,reference));
create index if not exists haunt_research_entries_user_time on haunt_private.research_entries(user_id,created_at desc);
alter table haunt_private.research_accounts enable row level security;
alter table haunt_private.research_entries enable row level security;
revoke all on haunt_private.research_accounts,haunt_private.research_entries from public,anon,authenticated;

create or replace function haunt_private.research_ensure(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform zone_wallet_private.lock();
 insert into haunt_private.research_accounts(user_id) values(target) on conflict do nothing;
 if found then insert into haunt_private.research_entries(user_id,delta,kind,reference) values(target,1000,'starter','v1') on conflict do nothing;end if;
end $$;
revoke all on function haunt_private.research_ensure(uuid) from public,anon,authenticated;
create or replace function haunt_private.research_view(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform haunt_private.research_ensure(target);
 return(select jsonb_build_object('schema',1,'currency','RP','balance',balance,'revision',revision) from haunt_private.research_accounts where user_id=target);
end $$;
revoke all on function haunt_private.research_view(uuid) from public,anon,authenticated;
create or replace function haunt_private.research_change(target uuid,amount bigint,kind text,reference text) returns void language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare prior bigint;
begin
 perform haunt_private.research_ensure(target);
 select delta into prior from haunt_private.research_entries e where e.user_id=target and e.kind=kind and e.reference=reference;
 if found then if prior<>amount then raise exception 'HAUNT_RESEARCH_RECEIPT';end if;return;end if;
 update haunt_private.research_accounts set balance=balance+amount,revision=revision+1 where user_id=target and balance+amount between 0 and 9007199254740991;
 if not found then raise exception 'HAUNT_RESEARCH_FUNDS';end if;
 insert into haunt_private.research_entries(user_id,delta,kind,reference) values(target,amount,kind,reference);
end $$;
revoke all on function haunt_private.research_change(uuid,bigint,text,text) from public,anon,authenticated;
create or replace function haunt_private.gear_view(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s haunt_private.gear_stashes;
begin
 perform haunt_private.ensure_gear(target);select * into s from haunt_private.gear_stashes where user_id=target;
 return jsonb_build_object('owned',s.items,'selected',s.selected,'prices',(select jsonb_object_agg(id,price) from haunt_private.gear_catalog),'funds',haunt_private.research_view(target));
end $$;
revoke all on function haunt_private.gear_view(uuid) from public,anon,authenticated;

create or replace function haunt_private.gear_command(action text,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();s haunt_private.gear_stashes;o haunt_private.gear_orders;tool text:=args->>'tool';quantity integer;price integer;request uuid;doc jsonb;choice jsonb;entry record;total integer:=0;deployed integer:=0;
begin
 if not exists(select 1 from public.zh_library where user_id=uid and game_id='zone-haunt') then raise exception 'HUB_LIBRARY';end if;
 perform zone_wallet_private.lock();perform haunt_private.research_ensure(uid);perform haunt_private.ensure_gear(uid);
 if action='gear_state' then return jsonb_build_object('gear',haunt_private.gear_view(uid),'wallet',zone_wallet_private.view(uid),'funds',haunt_private.research_view(uid));end if;
 if action='gear_buy' and coalesce(args->>'request','')~'^[a-f0-9-]{36}$' then select * into o from haunt_private.gear_orders where id=(args->>'request')::uuid;if found then if o.user_id<>uid or o.tool is distinct from tool or o.quantity::text is distinct from args->>'quantity' then raise exception 'HAUNT_GEAR_INPUT';end if;return jsonb_build_object('gear',haunt_private.gear_view(uid),'wallet',zone_wallet_private.view(uid),'funds',haunt_private.research_view(uid));end if;end if;
 if exists(select 1 from haunt_private.members m join haunt_private.rooms r on r.id=m.room_id where m.user_id=uid and m.active and r.phase='running' and r.expires_at>now()) then raise exception 'HAUNT_GEAR_RUNNING';end if;
 select * into s from haunt_private.gear_stashes where user_id=uid for update;
 if action='gear_buy' then
  if args->>'equipmentCurrency' is distinct from 'RP' then raise exception 'HAUNT_UPDATE_REQUIRED';end if;
  if coalesce(args->>'request','')!~'^[a-f0-9-]{36}$' or coalesce(args->>'quantity','')!~'^[1-4]$' then raise exception 'HAUNT_GEAR_INPUT';end if;request:=(args->>'request')::uuid;quantity:=(args->>'quantity')::integer;
  select * into o from haunt_private.gear_orders where id=request;if found then if o.user_id<>uid or o.tool<>tool or o.quantity<>quantity then raise exception 'HAUNT_GEAR_INPUT';end if;return jsonb_build_object('gear',haunt_private.gear_view(uid),'wallet',zone_wallet_private.view(uid),'funds',haunt_private.research_view(uid));end if;
  select c.price into price from haunt_private.gear_catalog c where c.id=tool;if price is null then raise exception 'HAUNT_GEAR_INPUT';end if;
  select coalesce(sum((d.items->>tool)::integer),0)::integer into deployed from haunt_private.deployments d join haunt_private.rooms r on r.id=d.room_id where d.user_id=uid and not d.settled and r.phase='running' and r.expires_at>now();
  if coalesce((s.items->>tool)::integer,0)+deployed+quantity>8 then raise exception 'HAUNT_GEAR_CAP';end if;
  perform haunt_private.research_change(uid,-price*quantity,'gear',request::text);
  s.items:=jsonb_set(s.items,array[tool],to_jsonb(coalesce((s.items->>tool)::integer,0)+quantity));if coalesce((s.selected->>tool)::integer,0)=0 and (select coalesce(sum((e.value#>>'{}')::integer),0) from jsonb_each(s.selected)e)<16 then s.selected:=jsonb_set(s.selected,array[tool],'1');end if;
  insert into haunt_private.gear_orders(id,user_id,tool,quantity,price,currency) values(request,uid,tool,quantity,price*quantity,'RP');
 elsif action='gear_select' then
  choice:=args->'selected';if jsonb_typeof(choice) is distinct from 'object' or octet_length(choice::text)>3000 then raise exception 'HAUNT_GEAR_INPUT';end if;
  for entry in select key,value from jsonb_each(choice) loop if not exists(select 1 from haunt_private.gear_catalog where id=entry.key) or jsonb_typeof(entry.value)<>'number' or (entry.value#>>'{}')!~'^[0-2]$' or (entry.value#>>'{}')::integer>coalesce((s.items->>entry.key)::integer,0) then raise exception 'HAUNT_GEAR_INPUT';end if;total:=total+(entry.value#>>'{}')::integer;end loop;
  if total>16 then raise exception 'HAUNT_GEAR_CAP';end if;s.selected:=choice;
 else raise exception 'HAUNT_ACTION';end if;
 update haunt_private.gear_stashes set items=s.items,selected=s.selected,updated_at=now() where user_id=uid;
 update haunt_private.members m set ready=(m.user_id=r.host_id) from haunt_private.rooms r where m.room_id=r.id and m.user_id=uid and m.active and r.phase='lobby';
 return jsonb_build_object('gear',haunt_private.gear_view(uid),'wallet',zone_wallet_private.view(uid),'funds',haunt_private.research_view(uid));
end $$;
revoke all on function haunt_private.gear_command(text,jsonb) from public,anon,authenticated;

-- Only legacy, explicitly tagged ZC results may enter a not-yet-migrated Hub wallet.
select zone_wallet_private.patch('zone_wallet_private.ensure(uuid)',
 'from haunt_private.results where user_id=target),0)',
 'from haunt_private.results where user_id=target and currency=''ZC''),0)',false);
create or replace function zone_wallet_private.haunt_reward() returns trigger language plpgsql security definer set search_path='' as $$
declare doc jsonb;
begin
 if new.currency='RP' then
  perform haunt_private.research_ensure(new.user_id);
  if new.money>0 then perform haunt_private.research_change(new.user_id,new.money,'contract',new.room_id::text);end if;
 elsif new.money>0 and exists(select 1 from zone_wallet_private.accounts where user_id=new.user_id) then
  perform zone_wallet_private.change(new.user_id,new.money,'haunt_result',new.room_id::text,'zone-haunt');
  select json into doc from public.saves where user_id=new.user_id for update;
  update public.saves set json=zone_wallet_private.project(doc,new.user_id),updated_at=now() where user_id=new.user_id;
 end if;return new;
end $$;
revoke all on function zone_wallet_private.haunt_reward() from public,anon,authenticated;
-- Reject a still-running legacy equipment RPC before its ZC debit can commit.
create or replace function haunt_private.reject_zc_gear() returns trigger language plpgsql security definer set search_path='' as $$ begin raise exception 'HAUNT_UPDATE_REQUIRED';end $$;
revoke all on function haunt_private.reject_zc_gear() from public,anon,authenticated;
drop trigger if exists haunt_legacy_gear_debit on zone_wallet_private.entries;
create trigger haunt_legacy_gear_debit before insert on zone_wallet_private.entries for each row when(new.reason='haunt_gear' and new.delta<0) execute function haunt_private.reject_zc_gear();

-- Preserve acquired items and return any ZC spent by the previous equipment shop.
-- Separate once-only receipt keys make this migration safe to apply again.
do $$ declare purchase record;person record;doc jsonb;begin
 for purchase in select * from haunt_private.gear_orders where currency='ZC' order by user_id,id loop
  perform zone_wallet_private.ensure(purchase.user_id);
  perform zone_wallet_private.change(purchase.user_id,purchase.price,'haunt_gear_refund',purchase.id::text,'zone-haunt');
 end loop;
 for person in select distinct user_id from haunt_private.gear_orders where currency='ZC' loop
  select json into doc from public.saves where user_id=person.user_id for update;
  update public.saves set json=zone_wallet_private.project(doc,person.user_id),updated_at=now() where user_id=person.user_id;
 end loop;
 for person in select user_id from public.zh_library where game_id='zone-haunt' loop perform haunt_private.research_ensure(person.user_id);end loop;
end $$;
notify pgrst,'reload schema';
