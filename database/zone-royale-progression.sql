-- Ranked results belong to Royale accounts, never to Strike's leaderboard/save stats.
create table if not exists zone_royale_private.progression(
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null default '{}',updated_at timestamptz not null default now()
);
create table if not exists zone_royale_private.results(
 match_id uuid not null,user_id uuid not null references auth.users(id) on delete cascade,
 ranked boolean not null,place integer not null,delta integer not null,created_at timestamptz not null default now(),
 primary key(match_id,user_id)
);
create index if not exists zr_results_user_time on zone_royale_private.results(user_id,created_at desc);
alter table zone_royale_private.progression enable row level security;
alter table zone_royale_private.results enable row level security;
revoke all on zone_royale_private.progression,zone_royale_private.results from public,anon,authenticated;

create or replace function zone_royale_private.badges(state jsonb) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(id order by id),'[]') from (values
 ('zr-first','kills',1),('zr-hunter','kills',100),('zr-victory','wins',1),('zr-champion','wins',10),
 ('zr-explorer','matches',25),('zr-top10','top10',10),('zr-survivor','seconds',3600),('zr-card','cards',5),
 ('zr-reboot','reboots',1),('zr-rescuer','reboots',10),('zr-ranked','rankedMatches',1),('zr-gold','points',700)
 ) d(id,key,goal) where coalesce((state->>key)::integer,0)>=goal
$$;
revoke all on function zone_royale_private.badges(jsonb) from public,anon,authenticated;

create or replace function zone_royale_private.progress(action text,args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();m zone_royale_private.matches;entry jsonb;row record;state jsonb;stats jsonb;
 place integer;elims integer;deaths integer;seconds integer;cards integer;reboots integer;points integer;change integer;key text;result jsonb;mid uuid;elapsed integer;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>32768 then raise exception 'ZR_RESULT_INPUT';end if;
 if action='finish' then
  if coalesce(args->>'match','')!~'^[a-f0-9-]{36}$' or jsonb_typeof(args->'players') is distinct from 'array' or jsonb_array_length(args->'players') not between 1 and 36 then raise exception 'ZR_RESULT_INPUT';end if;
  mid:=(args->>'match')::uuid;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(mid::text,168));
  select * into m from zone_royale_private.matches where id=mid;
  if m.id is null or m.host_id<>uid or m.phase<>'running' or m.protocol<>5 then raise exception 'ZR_RESULT_HOST' using errcode='42501';end if;
  if exists(select 1 from zone_royale_private.results where match_id=mid) then
   select p.state into result from zone_royale_private.progression p where p.user_id=uid;
   return jsonb_build_object('state',coalesce(result,'{}'),'duplicate',true);
  end if;
  elapsed:=greatest(0,extract(epoch from now()-m.closes_at)::integer);
  if elapsed<5 or jsonb_array_length(args->'players')<>jsonb_array_length(m.result_roster)
   or (select count(distinct p->>'cid') from jsonb_array_elements(args->'players') p)<>jsonb_array_length(args->'players')
   or exists(select 1 from jsonb_array_elements(args->'players') p where not exists(select 1 from jsonb_array_elements(m.result_roster) x where x->>'cid'=p->>'cid')) then raise exception 'ZR_RESULT_INPUT';end if;
  -- A team has a single placement; no two different human teams can both finish first.
  if exists(select 1 from jsonb_array_elements(m.result_roster) x
   join lateral jsonb_array_elements(args->'players') p on p->>'cid'=x->>'cid' group by x->>'team' having count(distinct p->>'place')>1)
   or (select count(distinct x->>'team') from jsonb_array_elements(m.result_roster) x join lateral jsonb_array_elements(args->'players') p on p->>'cid'=x->>'cid' where p->>'place'='1')>1 then raise exception 'ZR_RESULT_INPUT';end if;
  for row in select (x->>'uid')::uuid user_id,x->>'cid' cid from jsonb_array_elements(m.result_roster) x order by x->>'uid' loop
   select p into entry from jsonb_array_elements(args->'players') p where p->>'cid'=row.cid;
   foreach key in array array['place','kills','deaths','seconds','cards','reboots'] loop
    if coalesce(entry->>key,'')!~'^[0-9]{1,6}$' then raise exception 'ZR_RESULT_INPUT';end if;
   end loop;
   place:=(entry->>'place')::integer;elims:=(entry->>'kills')::integer;deaths:=(entry->>'deaths')::integer;seconds:=(entry->>'seconds')::integer;cards:=(entry->>'cards')::integer;reboots:=(entry->>'reboots')::integer;
   if place not between 1 and 36 or elims>150 or deaths>24 or seconds>least(7200,elapsed+60) or cards>48 or reboots>24 then raise exception 'ZR_RESULT_INPUT';end if;
   insert into zone_royale_private.progression(user_id) values(row.user_id) on conflict do nothing;
   select p.state into state from zone_royale_private.progression p where p.user_id=row.user_id for update;
   change:=case when m.ranked then greatest(-20,(case when place=1 then 100 when place<=3 then 60 when place<=10 then 25 else 0 end)+least(15,elims)*10+least(20,seconds/60)-20) else 0 end;
   stats:=jsonb_build_object('kills',elims,'deaths',deaths,'matches',1,'wins',case when place=1 then 1 else 0 end,'top10',case when place<=10 then 1 else 0 end,'seconds',seconds,'cards',cards,'reboots',reboots,'rankedMatches',case when m.ranked then 1 else 0 end,'rankedWins',case when m.ranked and place=1 then 1 else 0 end);
   for key in select jsonb_object_keys(stats) loop state:=jsonb_set(state,array[key],to_jsonb(coalesce((state->>key)::integer,0)+(stats->>key)::integer));end loop;
   points:=greatest(0,coalesce((state->>'points')::integer,0)+change);state:=state||jsonb_build_object('points',points,'lastDelta',change,'lastMatch',m.id,'bd',zone_royale_private.badges(state||jsonb_build_object('points',points)));
   update zone_royale_private.progression p set state=state,updated_at=now() where p.user_id=row.user_id;
   insert into zone_royale_private.results(match_id,user_id,ranked,place,delta) values(mid,row.user_id,m.ranked,place,change);
  end loop;
 elsif action<>'profile' then raise exception 'ZR_RESULT_INPUT';end if;
 select p.state into result from zone_royale_private.progression p where p.user_id=uid;
 return jsonb_build_object('state',coalesce(result,'{}'));
end $$;
revoke all on function zone_royale_private.progress(text,jsonb) from public,anon;
grant execute on function zone_royale_private.progress(text,jsonb) to authenticated;
create or replace function public.zone_royale_progress(action text,args jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select zone_royale_private.progress(action,args) $$;
revoke all on function public.zone_royale_progress(text,jsonb) from public,anon;
grant execute on function public.zone_royale_progress(text,jsonb) to authenticated;

insert into public.zh_achievement_definitions(game_id,id,title,description,xp) values
('zone-royale','zr-first','First elimination','Eliminate your first opponent on the island.',50),
('zone-royale','zr-hunter','Island hunter','Get 100 Battle Royale eliminations.',50),
('zone-royale','zr-victory','Last survivors','Win your first Battle Royale match.',50),
('zone-royale','zr-champion','Island crown','Win 10 Battle Royale matches.',50),
('zone-royale','zr-explorer','Island regular','Complete 25 island matches.',50),
('zone-royale','zr-top10','Among the best','Finish in the top ten teams in 10 matches.',50),
('zone-royale','zr-survivor','Storm veteran','Survive for a total of one hour in matches.',50),
('zone-royale','zr-card','Rescue run','Collect 5 teammate reboot cards.',50),
('zone-royale','zr-reboot','Second chance','Reboot a teammate at a reboot van.',50),
('zone-royale','zr-rescuer','Reliable teammate','Reboot 10 teammates at reboot vans.',50),
('zone-royale','zr-ranked','First ranked drop','Complete your first ranked Zone Royale match.',50),
('zone-royale','zr-gold','Golden drop','Reach Gold rank in Zone Royale.',50)
on conflict(game_id,id) do update set title=excluded.title,description=excluded.description;
