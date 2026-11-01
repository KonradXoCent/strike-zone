-- Finite, account-owned promotional openings; never a client-controlled ZC balance.
create table if not exists zone_football_private.test_pack_grants(
 user_id uuid not null references auth.users(id) on delete cascade,
 campaign text not null,pack text not null check(pack in ('bronze','silver','gold')),
 quantity integer not null check(quantity between 1 and 100),opened integer not null default 0 check(opened between 0 and quantity),
 created_at timestamptz not null default now(),primary key(user_id,campaign,pack));
alter table zone_football_private.test_pack_grants enable row level security;
revoke all on zone_football_private.test_pack_grants from public,anon,authenticated;
create or replace function zone_football_private.test_pack_view(target uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('bronze',coalesce(sum(quantity-opened) filter(where pack='bronze'),0),'silver',coalesce(sum(quantity-opened) filter(where pack='silver'),0),'gold',coalesce(sum(quantity-opened) filter(where pack='gold'),0)) from zone_football_private.test_pack_grants where user_id=target
$$;
revoke all on function zone_football_private.test_pack_view(uuid) from public,anon,authenticated;
create or replace function zone_football_private.packs_command(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();result jsonb;club zone_football_private.clubs;grant_row zone_football_private.test_pack_grants;receipt zone_football_private.packs;nonce uuid;kind text;tier text;roll float;pid text;card jsonb;pulled jsonb:='[]';
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>20000 then raise exception 'FOOTBALL_INPUT';end if;
 if action<>'open_test_pack' then result:=zone_football_private.command(action,args);
 else
  -- Existing command verifies ownership and establishes wallet/club lock order.
  result:=zone_football_private.command('state','{}');
  if coalesce(args->>'nonce','')!~'^[a-f0-9-]{36}$' then raise exception 'FOOTBALL_NONCE';end if;nonce:=(args->>'nonce')::uuid;kind:=args->>'pack';
  if kind not in ('bronze','silver','gold') or kind is null then raise exception 'FOOTBALL_PACK';end if;
  select * into receipt from zone_football_private.packs p where p.user_id=uid and p.nonce=nonce;
  if receipt.user_id is not null then
   if receipt.pack is distinct from 'test:'||kind then raise exception 'FOOTBALL_NONCE';end if;pulled:=receipt.cards;
  else
   select * into grant_row from zone_football_private.test_pack_grants g where g.user_id=uid and g.pack=kind and g.opened<g.quantity order by g.created_at,g.campaign limit 1 for update;
   if grant_row.user_id is null then raise exception 'FOOTBALL_TEST_PACKS_EMPTY';end if;
   select * into club from zone_football_private.clubs where user_id=uid for update;
   if jsonb_array_length(club.cards)>4997 then raise exception 'FOOTBALL_PACK';end if;
   for i in 1..3 loop
    roll:=random()*100;tier:=case when kind='bronze' then case when roll<85 then 'bronze' when roll<99 then 'silver' else 'gold' end when kind='silver' then case when roll<85 then 'silver' when roll<99 then 'gold' else 'elite' end else case when roll<94 then 'gold' else 'elite' end end;
    select p.id into pid from zone_football_private.players p where p.data->>'tier'=tier order by random() limit 1;
    card:=jsonb_build_object('id',gen_random_uuid(),'player_id',pid);pulled:=pulled||jsonb_build_array(card);
   end loop;
   insert into zone_football_private.packs(user_id,nonce,pack,cards) values(uid,nonce,'test:'||kind,pulled);
   update zone_football_private.clubs set cards=club.cards||pulled,revision=revision+1 where user_id=uid;
   update zone_football_private.test_pack_grants set opened=opened+1 where user_id=uid and campaign=grant_row.campaign and pack=kind;
  end if;
  result:=zone_football_private.command('state','{}')||jsonb_build_object('pulled',pulled,'test_opening',true);
 end if;
 if result ? 'club' then result:=result||jsonb_build_object('test_packs',zone_football_private.test_pack_view(uid));end if;
 return result;
end $$;
revoke all on function zone_football_private.packs_command(text,jsonb) from public,anon;
grant execute on function zone_football_private.packs_command(text,jsonb) to authenticated;
create or replace function public.zone_football(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select zone_football_private.packs_command(action,args) $$;
revoke all on function public.zone_football(text,jsonb) from public,anon;
grant execute on function public.zone_football(text,jsonb) to authenticated;

update public.zh_games set package_config=coalesce(package_config,'{}')||'{"version":"0.2.1"}'::jsonb where id='zone-football';
