-- Apply after haunt-research.sql. Every new contract has one free team item
-- of each type. Stashes/deployments contain only additional owned equipment;
-- the free kit is never charged, duplicated per member or lost permanently.
select zone_wallet_private.lock();
create or replace function haunt_private.basic_gear() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(id,1),'{}'::jsonb) from haunt_private.gear_catalog
$$;
revoke all on function haunt_private.basic_gear() from public,anon,authenticated;

create or replace function haunt_private.ensure_gear(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin insert into haunt_private.gear_stashes(user_id,items,selected) values(target,'{}','{}') on conflict do nothing;end $$;
revoke all on function haunt_private.ensure_gear(uuid) from public,anon,authenticated;

create or replace function haunt_private.gear_view(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s haunt_private.gear_stashes;
begin
 perform haunt_private.ensure_gear(target);select * into s from haunt_private.gear_stashes where user_id=target;
 return jsonb_build_object('owned',s.items,'selected',s.selected,'prices',(select jsonb_object_agg(id,price) from haunt_private.gear_catalog),'funds',haunt_private.research_view(target),'starter',haunt_private.basic_gear());
end $$;
revoke all on function haunt_private.gear_view(uuid) from public,anon,authenticated;

create or replace function haunt_private.room_view(room uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();r haunt_private.rooms;people jsonb;supply jsonb;
begin
 select * into r from haunt_private.rooms where id=room and expires_at>now();
 if r.next_room is not null and exists(select 1 from haunt_private.members where room_id=r.next_room and user_id=uid and active) then return haunt_private.room_view(r.next_room);end if;
 if r.id is null or not exists(select 1 from haunt_private.members where room_id=room and user_id=uid and active) then raise exception 'HAUNT_ROOM' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(l.name,'Investigator'),'image',l.avimg,'ready',m.ready,'online',m.last_seen>now()-interval '25 seconds') order by case when m.user_id=r.host_id then 0 else 1 end,m.user_id),'[]') into people from haunt_private.members m left join public.leaderboard l on l.user_id=m.user_id where m.room_id=room and m.active;
 if r.phase='lobby' then
  select jsonb_object_agg(c.id,1+coalesce(x.n,0)) into supply from haunt_private.gear_catalog c left join
   (select e.key k,sum((e.value#>>'{}')::integer)::integer n from haunt_private.members m join haunt_private.gear_stashes s on s.user_id=m.user_id cross join lateral jsonb_each(s.selected)e where m.room_id=room and m.active group by e.key)x on x.k=c.id;
 else supply:=r.supplies;end if;
 return jsonb_build_object('id',r.id,'protocol',r.protocol,'code',r.code,'hostId',r.host_id,'phase',r.phase,'mapId',r.map_id,'difficulty',r.difficulty,'bots',r.bots,'botCount',case when r.protocol=3 then r.bot_count else case when r.bots then 3 else 0 end end,'members',people,'seed',case when uid=r.host_id then r.seed end,'snapshot',r.snapshot,'roster',r.roster,'supplies',supply,'garage',r.garage,'hostLevel',haunt_private.level(r.host_id),'inputs',case when uid=r.host_id then coalesce((select jsonb_object_agg(m.user_id::text,m.input) from haunt_private.members m where m.room_id=room and m.active),'{}') else '{}' end);
end $$;
revoke all on function haunt_private.room_view(uuid) from public,anon,authenticated;

create or replace function haunt_private.prepare_gear(r haunt_private.rooms) returns jsonb language plpgsql security definer set search_path='' as $$
declare person record;s haunt_private.gear_stashes;e record;pool jsonb:=haunt_private.basic_gear();
begin
 for person in select user_id from haunt_private.members where room_id=r.id and active order by user_id loop
  perform haunt_private.ensure_gear(person.user_id);select * into s from haunt_private.gear_stashes where user_id=person.user_id for update;
  if exists(select 1 from haunt_private.deployments where room_id=r.id and user_id=person.user_id) then raise exception 'HAUNT_DEPLOYMENT';end if;
  for e in select key,value from jsonb_each(s.selected) loop if (e.value#>>'{}')::integer>coalesce((s.items->>e.key)::integer,0) then raise exception 'HAUNT_GEAR_CHANGED';end if;pool:=jsonb_set(pool,array[e.key],to_jsonb(coalesce((pool->>e.key)::integer,0)+(e.value#>>'{}')::integer));s.items:=jsonb_set(s.items,array[e.key],to_jsonb(coalesce((s.items->>e.key)::integer,0)-(e.value#>>'{}')::integer));end loop;
  insert into haunt_private.deployments(room_id,user_id,items) values(r.id,person.user_id,s.selected);update haunt_private.gear_stashes set items=s.items,selected='{}',updated_at=now() where user_id=person.user_id;
 end loop;return pool;
end $$;
revoke all on function haunt_private.prepare_gear(haunt_private.rooms) from public,anon,authenticated;

notify pgrst,'reload schema';
