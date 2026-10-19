-- Owner-controlled pool membership and immutable, pinned map versions.
-- Existing human counters and owned skins are preserved.
alter table public.sz_workshop_items add column case_enabled boolean not null default true;
grant select(case_enabled) on public.sz_workshop_items to anon,authenticated;
alter table public.sz_workshop_map_stats
 add column pool_rule text not null default 'auto' check(pool_rule in ('auto','manual','excluded')),
 add column pinned_release_id uuid references public.sz_workshop_releases(id) on delete set null,
 add column featured_release_id uuid references public.sz_workshop_releases(id) on delete set null,
 add column bot_plays bigint not null default 0 check(bot_plays>=0),
 add column bot_likes integer not null default 0 check(bot_likes>=0 and bot_likes<=bot_plays);
create index workshop_map_pinned_release on public.sz_workshop_map_stats(pinned_release_id) where pinned_release_id is not null;
create index workshop_map_featured_release on public.sz_workshop_map_stats(featured_release_id) where featured_release_id is not null;
alter table sz_workshop_private.map_sessions
 add column bot_count integer not null default 0 check(bot_count between 0 and 10),
 add column bot_likes integer not null default 0 check(bot_likes between 0 and bot_count);

create or replace function sz_workshop_private.rank_maps() returns void language plpgsql set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sz-workshop-map-pool',0));
 with manual as (
  select s.item_id,r.id as release_id,coalesce(r.payload->>'mode','tdm') as mode
  from public.sz_workshop_map_stats s join public.sz_workshop_items i on i.id=s.item_id and i.active and i.kind='map'
  join public.sz_workshop_releases r on r.id=s.pinned_release_id and r.item_id=i.id where s.pool_rule='manual'
 ), eligible as (
  select s.item_id,r.id as release_id,row_number() over(partition by s.mode order by
   ((s.likes+s.bot_likes)::numeric*c.min_plays+(s.plays+s.bot_plays)::numeric*c.min_likes) desc,
   (s.likes+s.bot_likes) desc,(s.plays+s.bot_plays) desc,s.item_id) as position,
   greatest(0,c.slots_per_mode-(select count(*) from manual m where m.mode=s.mode)) as slots
  from public.sz_workshop_map_stats s join public.sz_workshop_items i on i.id=s.item_id and i.active and i.kind='map'
  join public.sz_workshop_releases r on r.item_id=i.id and r.version=i.latest_version
  cross join public.sz_workshop_map_policy c
  where c.enabled and s.pool_rule='auto' and s.mode=coalesce(r.payload->>'mode','tdm')
   and s.plays+s.bot_plays>=c.min_plays and s.likes+s.bot_likes>=c.min_likes
 ), chosen as (select item_id,release_id from manual union all select item_id,release_id from eligible where position<=slots)
 update public.sz_workshop_map_stats s set featured=c.release_id is not null,featured_release_id=c.release_id,
  promoted_at=case when c.release_id is not null then coalesce(s.promoted_at,now()) else null end
 from (select a.item_id,b.release_id from public.sz_workshop_map_stats a left join chosen b on b.item_id=a.item_id) c
 where s.item_id=c.item_id and (s.featured is distinct from (c.release_id is not null) or s.featured_release_id is distinct from c.release_id);
end $$;

create or replace function sz_workshop_private.sync_map_release() returns trigger language plpgsql security definer set search_path='' as $$
declare md text; previous public.sz_workshop_map_stats%rowtype;
begin
 if not exists(select 1 from public.sz_workshop_items i where i.id=new.item_id and i.kind='map' and i.latest_version=new.version) then return new; end if;
 md:=coalesce(new.payload->>'mode','tdm');if md not in ('classic','tdm','ctf') then raise exception 'WORKSHOP_INVALID_PROJECT'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sz-workshop-map-pool',0));
 select * into previous from public.sz_workshop_map_stats where item_id=new.item_id;
 if found then
  -- Approval of an edit cannot silently replace a live map. The owner explicitly
  -- chooses the new version, or uses the atomic approve-and-add action below.
  if previous.featured and previous.pool_rule='auto' then
   update public.sz_workshop_map_stats set pool_rule='manual',pinned_release_id=previous.featured_release_id where item_id=new.item_id;
  end if;
  if previous.mode<>md then
   delete from public.sz_workshop_map_likes where item_id=new.item_id;
   update public.sz_workshop_map_stats set mode=md,plays=0,likes=0,bot_plays=0,bot_likes=0 where item_id=new.item_id;
  end if;
 else insert into public.sz_workshop_map_stats(item_id,mode) values(new.item_id,md);end if;
 perform sz_workshop_private.rank_maps();return new;
end $$;

create or replace function sz_workshop_private.rerank_map_visibility() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='map' and old.active is distinct from new.active then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sz-workshop-map-pool',0));
  if not new.active then update public.sz_workshop_map_stats set pool_rule='excluded',pinned_release_id=null where item_id=new.id;end if;
  perform sz_workshop_private.rank_maps();
 end if;return new;
end $$;

-- All publication paths take the pool lock before submission/project/item locks.
-- This matches moderation overrides and avoids lock-order inversions.
create or replace function sz_workshop_private.review_submission(submission uuid,decision text,note text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); s public.sz_workshop_submissions%rowtype; item uuid; ver integer;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or not exists(select 1 from public.sz_workshop_admins where user_id=uid) then raise exception 'WORKSHOP_ADMIN_REQUIRED' using errcode='42501';end if;
 if coalesce(decision,'') not in ('approved','rejected') or note is null or length(note)>500 or (decision='rejected' and length(trim(note))=0) then raise exception 'WORKSHOP_REVIEW_NOTE_REQUIRED' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sz-workshop-map-pool',0));
 select * into s from public.sz_workshop_submissions where id=submission for update;
 if not found then raise exception 'WORKSHOP_NOT_FOUND' using errcode='P0002';end if;
 if s.status<>'pending' then
  if s.status=decision and s.review_note=note then return(select item_id from public.sz_workshop_releases where id=s.id);end if;
  raise exception 'WORKSHOP_ALREADY_REVIEWED' using errcode='40001';
 end if;
 if decision='approved' then
  if not sz_workshop_private.project_valid(s.kind,s.payload,true) then raise exception 'WORKSHOP_INVALID_PROJECT' using errcode='22023';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(s.author_id::text||s.kind||s.project_id,0));
  insert into public.sz_workshop_items(owner_id,project_id,kind,title,author_name,latest_version)
   values(s.author_id,s.project_id,s.kind,s.title,s.author_name,1)
   on conflict(owner_id,kind,project_id) do update set title=excluded.title,author_name=excluded.author_name,latest_version=sz_workshop_items.latest_version+1,active=true,updated_at=now()
   returning id,latest_version into item,ver;
  insert into public.sz_workshop_releases(id,item_id,version,payload) values(s.id,item,ver,s.payload);
 end if;
 update public.sz_workshop_submissions set status=decision,review_note=note,reviewed_by=uid,reviewed_at=now() where id=s.id;return item;
end $$;

create or replace function sz_workshop_private.withdraw_item(item uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or not exists(select 1 from public.sz_workshop_admins where user_id=uid) then raise exception 'WORKSHOP_ADMIN_REQUIRED' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sz-workshop-map-pool',0));
 update public.sz_workshop_items set active=false,updated_at=now() where id=item;return found;
end $$;

-- The original settings/state/human-like implementation remains private.
alter function sz_workshop_private.map_action(text,jsonb) rename to map_action_base;
revoke execute on function sz_workshop_private.map_action_base(text,jsonb) from public,anon,authenticated;
create function sz_workshop_private.map_action(action text,args jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();target uuid;rel uuid;nonce uuid;md text;rule text;bots integer:=0;bot_votes integer:=0;idx integer;want boolean;
 item public.sz_workshop_items%rowtype; s sz_workshop_private.map_sessions%rowtype;result jsonb;
begin
 if args is null or jsonb_typeof(args)<>'object' then raise exception 'WORKSHOP_MAP_INPUT';end if;
 if action='state' then return sz_workshop_private.map_action_base(action,args)||jsonb_build_object('moderation_version',1);end if;
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'WORKSHOP_LOGIN_REQUIRED' using errcode='42501';end if;
 if action in ('pool','approve_pool','case_pool') then
  if not exists(select 1 from public.sz_workshop_admins where user_id=uid) then raise exception 'WORKSHOP_ADMIN_REQUIRED' using errcode='42501';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sz-workshop-map-pool',0));
  if action='approve_pool' then
   nonce:=(args->>'submission')::uuid;
   if not exists(select 1 from public.sz_workshop_submissions where id=nonce and kind='map') then raise exception 'WORKSHOP_MAP_NOT_FOUND';end if;
   target:=sz_workshop_private.review_submission(nonce,'approved',coalesce(args->>'note',''));rel:=nonce;rule:='manual';
  else target:=(args->>'item')::uuid;rel:=nullif(args->>'release','')::uuid;rule:=args->>'rule';end if;
  select * into item from public.sz_workshop_items where id=target and active for update;
  if not found then raise exception 'WORKSHOP_NOT_FOUND';end if;
  if action='approve_pool' and not exists(select 1 from public.sz_workshop_releases where id=rel and item_id=target and version=item.latest_version) then raise exception 'WORKSHOP_VERSION_CHANGED';end if;
  if action='case_pool' then
   if item.kind<>'skin' or jsonb_typeof(args->'enabled') is distinct from 'boolean' then raise exception 'WORKSHOP_MAP_INPUT';end if;
   update public.sz_workshop_items set case_enabled=(args->>'enabled')::boolean,updated_at=now() where id=target;
   return jsonb_build_object('item',target,'case_enabled',(args->>'enabled')::boolean);
  end if;
  if item.kind<>'map' or coalesce(rule,'') not in ('auto','manual','excluded') then raise exception 'WORKSHOP_MAP_INPUT';end if;
  if args ? 'expected_latest' and not exists(select 1 from public.sz_workshop_releases where item_id=target and version=item.latest_version and id=(args->>'expected_latest')::uuid) then raise exception 'WORKSHOP_VERSION_CHANGED';end if;
  if rule='manual' and not exists(select 1 from public.sz_workshop_releases where id=rel and item_id=target) then raise exception 'WORKSHOP_MAP_NOT_FOUND';end if;
  update public.sz_workshop_map_stats set pool_rule=rule,pinned_release_id=case when rule='manual' then rel else null end where item_id=target;
  perform sz_workshop_private.rank_maps();return jsonb_build_object('item',target,'rule',rule,'release',rel);
 elsif action='start' then
  rel:=(args->>'release')::uuid;nonce:=(args->>'session')::uuid;md:=args->>'mode';
  if nonce is null or md is null or (args ? 'bots' and (jsonb_typeof(args->'bots') is distinct from 'number' or coalesce(args->>'bots','')!~'^(10|[0-9])$')) then raise exception 'WORKSHOP_MAP_INPUT';end if;
  bots:=coalesce((args->>'bots')::integer,0);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sz-workshop-map-pool',0));
  select * into s from sz_workshop_private.map_sessions where id=nonce;
  if found then
   if s.user_id<>uid or s.release_id<>rel or s.mode<>md or s.bot_count<>bots then raise exception 'WORKSHOP_PLAY_ID';end if;
   return jsonb_build_object('session',s.id,'counted',s.counted);
  end if;
  select i.id into target from public.sz_workshop_items i join public.sz_workshop_releases r on r.item_id=i.id
   join public.sz_workshop_map_stats m on m.item_id=i.id
   where r.id=rel and i.active and i.kind='map' and coalesce(r.payload->>'mode','tdm')=md
    and (r.version=i.latest_version or r.id=m.featured_release_id);
  if target is null then raise exception 'WORKSHOP_MAP_NOT_FOUND';end if;
  if(select count(*) from sz_workshop_private.map_sessions where user_id=uid and created_at>now()-interval '1 hour')>=60 then raise exception 'WORKSHOP_PLAY_RATE';end if;
  insert into sz_workshop_private.map_sessions(id,user_id,item_id,release_id,mode,bot_count) values(nonce,uid,target,rel,md,bots);
  return jsonb_build_object('session',nonce,'counted',false);
 elsif action='finish' then
  nonce:=(args->>'session')::uuid;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sz-workshop-map-pool',0));
  select * into s from sz_workshop_private.map_sessions where id=nonce and user_id=uid for update;
  if not found then raise exception 'WORKSHOP_PLAY_ID';end if;
  if s.finished_at is not null then return jsonb_build_object('counted',s.counted,'bot_plays',case when s.counted then s.bot_count else 0 end,'bot_likes',s.bot_likes);end if;
  if clock_timestamp()<s.created_at+interval '60 seconds' then return jsonb_build_object('counted',false,'retry_after',ceil(extract(epoch from s.created_at+interval '60 seconds'-clock_timestamp())));end if;
  want:=exists(select 1 from public.sz_workshop_items i join public.sz_workshop_map_stats m on m.item_id=i.id join public.sz_workshop_releases r on r.item_id=i.id
   where i.id=s.item_id and i.active and m.mode=s.mode and r.id=s.release_id and r.version=i.latest_version)
   and not exists(select 1 from sz_workshop_private.map_sessions p where p.user_id=uid and p.item_id=s.item_id and p.counted and p.finished_at>now()-interval '5 minutes');
  if want then
   for idx in 1..s.bot_count loop if pg_catalog.random()<0.35 then bot_votes:=bot_votes+1;end if;end loop;
   update public.sz_workshop_map_stats set plays=plays+1,bot_plays=bot_plays+s.bot_count,bot_likes=bot_likes+bot_votes where item_id=s.item_id;
  end if;
  update sz_workshop_private.map_sessions set finished_at=clock_timestamp(),counted=want,bot_likes=bot_votes where id=nonce;
  if want then perform sz_workshop_private.rank_maps();end if;
  return jsonb_build_object('counted',want,'bot_plays',case when want then s.bot_count else 0 end,'bot_likes',bot_votes);
 end if;
 return sz_workshop_private.map_action_base(action,args);
end $$;
revoke execute on function sz_workshop_private.map_action(text,jsonb) from public,anon,authenticated;
grant execute on function sz_workshop_private.map_action(text,jsonb) to anon,authenticated;
create or replace function public.sz_workshop_map(action text,args jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select sz_workshop_private.map_action(action,args) $$;

-- Preserve the original columns/types for installed clients. A pinned map's
-- release_id/version/mode describe the same immutable release, even after edits.
select sz_workshop_private.rank_maps();
create or replace view public.sz_workshop_catalog with(security_invoker=true) as
select i.id,i.kind,coalesce(r.payload->>'name',i.title) as title,i.author_name,r.version,r.id as release_id,i.updated_at,
 r.payload->>'weapon' as weapon,r.payload->>'model' as model,r.payload->>'theme' as theme,
 case when i.kind='map' then coalesce(r.payload->>'mode','tdm') end as mode,
 coalesce(s.plays,0)+coalesce(s.bot_plays,0) as plays,coalesce(s.likes,0)+coalesce(s.bot_likes,0) as likes,coalesce(s.featured,false) as featured,s.promoted_at,
 latest.id as latest_release_id,i.latest_version,coalesce(s.pool_rule,'auto') as pool_rule,i.case_enabled,
 coalesce(s.plays,0) as player_plays,coalesce(s.likes,0) as player_likes,coalesce(s.bot_plays,0) as bot_plays,coalesce(s.bot_likes,0) as bot_likes
from public.sz_workshop_items i join public.sz_workshop_releases latest on latest.item_id=i.id and latest.version=i.latest_version
left join public.sz_workshop_map_stats s on s.item_id=i.id
join public.sz_workshop_releases r on r.id=coalesce(s.featured_release_id,latest.id) and r.item_id=i.id where i.active;

-- Case membership affects future drops only; owned instances/proofs remain valid.
create or replace function sz_workshop_private.case_buy(request_id uuid, profile_name text, expected_ts bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); c public.sz_workshop_cases%rowtype; saved jsonb; balance numeric; stamp bigint;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'WORKSHOP_LOGIN_REQUIRED' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sz-workshop-map-pool',0));
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
 if (select count(*) from public.sz_workshop_items where kind='skin' and active and case_enabled)<5 then raise exception 'FORGE_NEEDS_FIVE'; end if;
 if coalesce((saved->>'ts')::bigint,0)<>expected_ts then raise exception 'FORGE_STALE_SAVE'; end if;
 if balance<2500 then raise exception 'FORGE_FUNDS'; end if;
 if (select count(*) from public.sz_workshop_cases where user_id=uid and opened_at is null)>=100 then raise exception 'FORGE_CASE_LIMIT'; end if;
 stamp:=greatest(expected_ts+1,(extract(epoch from clock_timestamp())*1000)::bigint);
 saved:=jsonb_set(jsonb_set(saved,array['profiles',profile_name,'wallet'],to_jsonb(balance-2500)),array['ts'],to_jsonb(stamp));
 update public.saves set json=saved,updated_at=now() where user_id=uid;
 insert into public.sz_workshop_cases(id,user_id,profile) values(request_id,uid,profile_name) returning * into c;
 return jsonb_build_object('case',to_jsonb(c),'balance',balance-2500,'saved_ts',stamp);
end $$;

create or replace function sz_workshop_private.case_open(case_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); c public.sz_workshop_cases%rowtype; reward public.sz_workshop_owned_skins%rowtype; chosen record;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'WORKSHOP_LOGIN_REQUIRED' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sz-workshop-map-pool',0));
 select * into c from public.sz_workshop_cases where id=case_id and user_id=uid for update;
 if not found then raise exception 'FORGE_CASE_NOT_OWNED' using errcode='42501'; end if;
 if c.reward_id is not null then select * into reward from public.sz_workshop_owned_skins where id=c.reward_id;return to_jsonb(reward);end if;
 select i.id as item_id,r.id as release_id,r.version,i.author_name,r.payload into chosen
 from public.sz_workshop_items i join public.sz_workshop_releases r on r.item_id=i.id and r.version=i.latest_version
 where i.kind='skin' and i.active and i.case_enabled order by pg_catalog.random() limit 1 for share of i;
 if not found then raise exception 'FORGE_EMPTY'; end if;
 insert into public.sz_workshop_owned_skins(user_id,case_id,item_id,release_id,version,author_name,payload,stattrak)
 values(uid,c.id,chosen.item_id,chosen.release_id,chosen.version,chosen.author_name,chosen.payload,pg_catalog.random()<0.10) returning * into reward;
 update public.sz_workshop_cases set opened_at=now(),reward_id=reward.id where id=c.id;
 return to_jsonb(reward);
end $$;


notify pgrst,'reload schema';
