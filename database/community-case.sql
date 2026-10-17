-- Community Forge Case: server-issued cases and owned skin instances.
create table public.sz_workshop_cases (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 profile text not null,
 price integer not null default 2500 check(price=2500),
 purchased_at timestamptz not null default now(),
 opened_at timestamptz,
 reward_id uuid unique
);
create index workshop_cases_owner on public.sz_workshop_cases(user_id,purchased_at desc);
alter table public.sz_workshop_cases enable row level security;
revoke all on public.sz_workshop_cases from public,anon,authenticated;
grant select on public.sz_workshop_cases to authenticated;
create policy workshop_cases_own on public.sz_workshop_cases for select to authenticated using(user_id=(select auth.uid()));

create table public.sz_workshop_owned_skins (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 case_id uuid not null unique references public.sz_workshop_cases(id),
 item_id uuid not null references public.sz_workshop_items(id),
 release_id uuid not null references public.sz_workshop_releases(id),
 version integer not null,
 author_name text not null,
 payload jsonb not null,
 stattrak boolean not null,
 acquired_at timestamptz not null default now()
);
create index workshop_owned_user on public.sz_workshop_owned_skins(user_id,acquired_at desc);
create index workshop_owned_release on public.sz_workshop_owned_skins(release_id);
create index workshop_owned_item on public.sz_workshop_owned_skins(item_id);
alter table public.sz_workshop_owned_skins enable row level security;
revoke all on public.sz_workshop_owned_skins from public,anon,authenticated;
grant select on public.sz_workshop_owned_skins to authenticated;
create policy workshop_skins_own on public.sz_workshop_owned_skins for select to authenticated using(user_id=(select auth.uid()));

create function sz_workshop_private.case_buy(request_id uuid, profile_name text, expected_ts bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); c public.sz_workshop_cases%rowtype; saved jsonb; balance numeric; stamp bigint;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'WORKSHOP_LOGIN_REQUIRED' using errcode='42501'; end if;
 if request_id is null or profile_name is null or expected_ts is null then raise exception 'FORGE_INVALID_REQUEST'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,3701));
 select json into saved from public.saves where user_id=uid for update;
 if saved is null or saved->>'cur' is distinct from profile_name or jsonb_typeof(saved->'profiles'->profile_name->'wallet') is distinct from 'number' then raise exception 'FORGE_SAVE_REQUIRED'; end if;
 balance:=(saved->'profiles'->profile_name->>'wallet')::numeric;
 select * into c from public.sz_workshop_cases where id=request_id;
 if found then
  if c.user_id<>uid or c.profile<>profile_name then raise exception 'FORGE_INVALID_REQUEST' using errcode='42501'; end if;
  return jsonb_build_object('case',to_jsonb(c),'balance',balance,'saved_ts',saved->'ts');
 end if;
 if (select count(*) from public.sz_workshop_items where kind='skin' and active)<5 then raise exception 'FORGE_NEEDS_FIVE'; end if;
 if coalesce((saved->>'ts')::bigint,0)<>expected_ts then raise exception 'FORGE_STALE_SAVE'; end if;
 if balance<2500 then raise exception 'FORGE_FUNDS'; end if;
 if (select count(*) from public.sz_workshop_cases where user_id=uid and opened_at is null)>=100 then raise exception 'FORGE_CASE_LIMIT'; end if;
 stamp:=greatest(expected_ts+1,(extract(epoch from clock_timestamp())*1000)::bigint);
 saved:=jsonb_set(jsonb_set(saved,array['profiles',profile_name,'wallet'],to_jsonb(balance-2500)),array['ts'],to_jsonb(stamp));
 update public.saves set json=saved,updated_at=now() where user_id=uid;
 insert into public.sz_workshop_cases(id,user_id,profile) values(request_id,uid,profile_name) returning * into c;
 return jsonb_build_object('case',to_jsonb(c),'balance',balance-2500,'saved_ts',stamp);
end $$;

create function sz_workshop_private.case_open(case_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); c public.sz_workshop_cases%rowtype; reward public.sz_workshop_owned_skins%rowtype; chosen record;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'WORKSHOP_LOGIN_REQUIRED' using errcode='42501'; end if;
 select * into c from public.sz_workshop_cases where id=case_id and user_id=uid for update;
 if not found then raise exception 'FORGE_CASE_NOT_OWNED' using errcode='42501'; end if;
 if c.reward_id is not null then select * into reward from public.sz_workshop_owned_skins where id=c.reward_id;return to_jsonb(reward);end if;
 select i.id as item_id,r.id as release_id,r.version,i.author_name,r.payload into chosen
 from public.sz_workshop_items i join public.sz_workshop_releases r on r.item_id=i.id and r.version=i.latest_version
 where i.kind='skin' and i.active order by pg_catalog.random() limit 1 for share of i;
 if not found then raise exception 'FORGE_EMPTY'; end if;
 insert into public.sz_workshop_owned_skins(user_id,case_id,item_id,release_id,version,author_name,payload,stattrak)
 values(uid,c.id,chosen.item_id,chosen.release_id,chosen.version,chosen.author_name,chosen.payload,pg_catalog.random()<0.10) returning * into reward;
 update public.sz_workshop_cases set opened_at=now(),reward_id=reward.id where id=c.id;
 return to_jsonb(reward);
end $$;

-- A peer can verify one displayed instance; full inventories remain private.
create function sz_workshop_private.skin_proof(instance_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',o.id,'user_id',o.user_id,'release_id',o.release_id,'item_id',o.item_id,'stattrak',o.stattrak)
 from public.sz_workshop_owned_skins o join public.sz_workshop_items i on i.id=o.item_id
 where auth.uid() is not null and o.id=instance_id and i.active;
$$;
revoke execute on function sz_workshop_private.case_buy(uuid,text,bigint),sz_workshop_private.case_open(uuid),sz_workshop_private.skin_proof(uuid) from public,anon;
grant execute on function sz_workshop_private.case_buy(uuid,text,bigint),sz_workshop_private.case_open(uuid),sz_workshop_private.skin_proof(uuid) to authenticated;
create function public.sz_workshop_case_buy(request_id uuid,profile_name text,expected_ts bigint) returns jsonb
language sql security invoker set search_path='' as $$ select sz_workshop_private.case_buy(request_id,profile_name,expected_ts); $$;
create function public.sz_workshop_case_open(case_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select sz_workshop_private.case_open(case_id); $$;
create function public.sz_workshop_skin_proof(instance_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select sz_workshop_private.skin_proof(instance_id); $$;
revoke execute on function public.sz_workshop_case_buy(uuid,text,bigint),public.sz_workshop_case_open(uuid),public.sz_workshop_skin_proof(uuid) from public,anon;
grant execute on function public.sz_workshop_case_buy(uuid,text,bigint),public.sz_workshop_case_open(uuid),public.sz_workshop_skin_proof(uuid) to authenticated;
