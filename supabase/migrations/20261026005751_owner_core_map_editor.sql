create table public.sz_core_map_owners (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.sz_core_map_owners enable row level security;
revoke all on public.sz_core_map_owners from public, anon, authenticated;
grant select on public.sz_core_map_owners to authenticated;
grant all on public.sz_core_map_owners to service_role;
create policy core_owner_self on public.sz_core_map_owners for select to authenticated
 using (user_id=(select auth.uid()));
insert into public.sz_core_map_owners(user_id)
 select u.id from auth.users u join public.sz_workshop_admins a on a.user_id=u.id
 where u.id='653d6936-ed9d-4e49-989a-2d9f5ba049f3'::uuid;

create table public.sz_core_maps (
 map_key text primary key check (map_key ~ '^core-[0-9]{1,3}-[a-z0-9-]{1,45}$'),
 revision bigint not null check (revision>0),
 payload jsonb check (payload is null or (jsonb_typeof(payload)='object' and octet_length(payload::text)<=524288)),
 updated_by uuid not null default auth.uid() references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.sz_core_maps enable row level security;
revoke all on public.sz_core_maps from public, anon, authenticated;
grant select on public.sz_core_maps to anon, authenticated;
grant insert,update on public.sz_core_maps to authenticated;
grant all on public.sz_core_maps to service_role;
create policy core_maps_public_read on public.sz_core_maps for select to anon,authenticated using(true);
create policy core_maps_owner_insert on public.sz_core_maps for insert to authenticated
 with check (updated_by=(select auth.uid()) and exists(select 1 from public.sz_core_map_owners where user_id=(select auth.uid())));
create policy core_maps_owner_update on public.sz_core_maps for update to authenticated
 using (exists(select 1 from public.sz_core_map_owners where user_id=(select auth.uid())))
 with check (updated_by=(select auth.uid()) and exists(select 1 from public.sz_core_map_owners where user_id=(select auth.uid())));

create table public.sz_core_map_history (
 map_key text not null references public.sz_core_maps(map_key),
 revision bigint not null check(revision>0),
 payload jsonb,
 updated_by uuid not null default auth.uid() references auth.users(id),
 updated_at timestamptz not null default now(),
 primary key(map_key,revision)
);
alter table public.sz_core_map_history enable row level security;
revoke all on public.sz_core_map_history from public,anon,authenticated;
grant select,insert on public.sz_core_map_history to authenticated;
grant all on public.sz_core_map_history to service_role;
create policy core_history_owner_read on public.sz_core_map_history for select to authenticated
 using(exists(select 1 from public.sz_core_map_owners where user_id=(select auth.uid())));
create policy core_history_owner_insert on public.sz_core_map_history for insert to authenticated
 with check(updated_by=(select auth.uid()) and exists(select 1 from public.sz_core_map_owners where user_id=(select auth.uid())));

create function public.sz_core_map_publish(p_map_key text,p_expected_revision bigint,p_document jsonb)
 returns jsonb language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); current_revision bigint; next_revision bigint; entry public.sz_core_maps;
 n integer; raw bytea; cols integer; rows integer; cell numeric; width numeric; height numeric; layer jsonb;
begin
 if uid is null or not exists(select 1 from public.sz_core_map_owners o where o.user_id=uid) then
  raise exception 'CORE_MAP_OWNER_REQUIRED' using errcode='42501';
 end if;
 if p_map_key is null or p_map_key !~ '^core-[0-9]{1,3}-[a-z0-9-]{1,45}$' or p_expected_revision is null or p_expected_revision<0 then
  raise exception 'CORE_MAP_INVALID';
 end if;
 if p_document is not null then
  if jsonb_typeof(p_document) is distinct from 'object' or octet_length(p_document::text)>524288 or
     p_document->>'kind' is distinct from 'sz-core-map' or p_document->>'version' is distinct from '1' or
     p_document->>'key' is distinct from p_map_key or
     coalesce(p_document->>'base','') !~ '^[0-9a-f]{8}$' or
     coalesce(p_document->>'format','') not in ('grid','rect') then raise exception 'CORE_MAP_INVALID'; end if;
  width:=(p_document->>'width')::numeric; height:=(p_document->>'height')::numeric;
  if width is null or height is null or width<128 or height<128 or width>8192 or height>8192 then raise exception 'CORE_MAP_INVALID'; end if;
  if p_document->>'format'='grid' then
   cols:=(p_document->>'cols')::integer; rows:=(p_document->>'rows')::integer; cell:=(p_document->>'cell')::numeric;
   if cols is null or rows is null or cell is null or cols<8 or rows<8 or cols>256 or rows>256 or cell<4 or cell>64 or cols*cell<>width or rows*cell<>height or coalesce(p_document->>'cells','') !~ '^[A-Za-z0-9+/]+={0,2}$' then raise exception 'CORE_MAP_INVALID'; end if;
   raw:=decode(p_document->>'cells','base64');
   if octet_length(raw)<>cols*rows then raise exception 'CORE_MAP_INVALID'; end if;
   for n in 0..octet_length(raw)-1 loop
    if get_byte(raw,n)>3 then raise exception 'CORE_MAP_INVALID'; end if;
   end loop;
  end if;
  foreach layer in array array[p_document->'walls',p_document->'covers',p_document->'windows',p_document->'sites'] loop
   if jsonb_typeof(layer) is distinct from 'array' or jsonb_array_length(layer)>3000 then raise exception 'CORE_MAP_INVALID'; end if;
  end loop;
  if p_document->'spawns' is distinct from 'null'::jsonb and (jsonb_typeof(p_document->'spawns') is distinct from 'array' or jsonb_array_length(p_document->'spawns')<>2) then raise exception 'CORE_MAP_INVALID'; end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('sz-core-map:'||p_map_key,0));
 select m.revision into current_revision from public.sz_core_maps m where m.map_key=p_map_key for update;
 current_revision:=coalesce(current_revision,0);
 if current_revision<>p_expected_revision then raise exception 'CORE_MAP_VERSION_CHANGED'; end if;
 next_revision:=current_revision+1;
 insert into public.sz_core_maps(map_key,revision,payload,updated_by,updated_at)
  values(p_map_key,next_revision,p_document,uid,now())
  on conflict(map_key) do update set revision=excluded.revision,payload=excluded.payload,updated_by=excluded.updated_by,updated_at=excluded.updated_at
  returning * into entry;
 insert into public.sz_core_map_history(map_key,revision,payload,updated_by,updated_at)
  values(entry.map_key,entry.revision,entry.payload,entry.updated_by,entry.updated_at);
 return to_jsonb(entry);
end; $$;
revoke all on function public.sz_core_map_publish(text,bigint,jsonb) from public,anon;
grant execute on function public.sz_core_map_publish(text,bigint,jsonb) to authenticated;
notify pgrst,'reload schema';
