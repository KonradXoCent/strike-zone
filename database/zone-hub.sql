-- Zone Hub shares Auth, saved game achievements and mutual friendships with SZ2D.
-- All mutations go through a narrowly scoped command; clients cannot grant XP,
-- write playtime, edit somebody else's profile or purchase a non-free title.
create schema if not exists zone_hub_private;
revoke all on schema zone_hub_private from public,anon,authenticated;
create table if not exists public.zh_games(
 id text primary key check(id ~ '^[a-z0-9-]{1,48}$'),title text not null,
 description_pl text not null,description_en text not null,tags text[] not null default '{}',
 free boolean not null default true,published boolean not null default false
);
insert into public.zh_games values('strike-zone','Strike Zone 2D',
 'Taktyczna akcja 2.5D. Rywalizacja, piłka nożna, Prop Hunt, zombie i mapy społeczności.',
 'Tactical 2.5D action. Competitive matches, football, Prop Hunt, zombies and community maps.',
 array['Action','Multiplayer','Free to play'],true,true) on conflict(id) do nothing;
create table if not exists public.zh_achievement_definitions(
 game_id text not null references public.zh_games(id),id text not null,
 title text not null,description text not null,xp integer not null default 50 check(xp between 0 and 100),
 primary key(game_id,id)
);
create table if not exists public.zh_library(
 user_id uuid not null references auth.users(id) on delete cascade,
 game_id text not null references public.zh_games(id),added_at timestamptz not null default now(),
 seconds_played bigint not null default 0 check(seconds_played>=0),last_played timestamptz,
 primary key(user_id,game_id)
);
create table if not exists public.zh_profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 bio text not null default '' check(length(bio)<=500),
 comments text not null default 'everyone' check(comments in ('everyone','friends','off')),
 accent text not null default 'violet' check(accent in ('violet','ocean','ember','forest')),
 pinned text[] not null default '{}' check(cardinality(pinned)<=3),created_at timestamptz not null default now()
);
create table if not exists public.zh_profile_comments(
 id uuid primary key default gen_random_uuid(),profile_id uuid not null references auth.users(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(btrim(body)) between 1 and 600),created_at timestamptz not null default now()
);
create index if not exists zh_comments_profile_time on public.zh_profile_comments(profile_id,created_at desc);
create index if not exists zh_comments_author_time on public.zh_profile_comments(author_id,created_at desc);
create table if not exists zone_hub_private.play_sessions(
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,
 game_id text not null references public.zh_games(id),last_tick timestamptz not null default now(),closed boolean not null default false
);
create index if not exists zh_play_session_user on zone_hub_private.play_sessions(user_id,last_tick desc);
alter table public.zh_games enable row level security;
alter table public.zh_achievement_definitions enable row level security;
alter table public.zh_library enable row level security;
alter table public.zh_profiles enable row level security;
alter table public.zh_profile_comments enable row level security;
alter table zone_hub_private.play_sessions enable row level security;
revoke all on public.zh_games,public.zh_achievement_definitions,public.zh_library,public.zh_profiles,public.zh_profile_comments from public,anon,authenticated;
grant select on public.zh_games,public.zh_achievement_definitions,public.zh_library,public.zh_profiles,public.zh_profile_comments to authenticated;
create policy zh_games_read on public.zh_games for select to authenticated using(published);
create policy zh_achievements_read on public.zh_achievement_definitions for select to authenticated using(exists(select 1 from public.zh_games g where g.id=game_id and g.published));
create policy zh_library_own on public.zh_library for select to authenticated using(user_id=(select auth.uid()));
create policy zh_profiles_read on public.zh_profiles for select to authenticated using(true);
create policy zh_comments_read on public.zh_profile_comments for select to authenticated using(true);

create or replace function zone_hub_private.profile(target uuid,viewer uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; save jsonb; player jsonb; badges jsonb; earned jsonb; points integer;
begin
 select json into save from public.saves where user_id=target;
 begin if jsonb_typeof(save)='string' then save:=(save#>>'{}')::jsonb; end if; exception when others then save:='{}'; end;
 player:=save->'profiles'->(save->>'cur');
 if player is null then select value into player from jsonb_each(case when jsonb_typeof(save->'profiles')='object' then save->'profiles' else '{}' end) limit 1; end if;
 badges:=case when jsonb_typeof(player->'bd')='array' then player->'bd' else '[]' end;
 select coalesce(jsonb_agg(d.id order by d.id),'[]'),coalesce(sum(d.xp),0)::integer into earned,points from public.zh_achievement_definitions d where d.game_id='strike-zone' and badges ? d.id;
 points:=points+100*(select count(*)::integer from public.zh_library where user_id=target);
 select jsonb_build_object('id',target,'name',coalesce(l.name,'Player'),'image',l.avimg,'bio',coalesce(p.bio,''),'accent',coalesce(p.accent,'violet'),
  'comments',coalesce(p.comments,'everyone'),'pinned',coalesce(p.pinned,'{}'),'xp',points,'level',1+points/250,'levelProgress',points%250,
  'achievements',earned,'canComment',target=viewer or coalesce(p.comments,'everyone')='everyone' or p.comments='friends' and exists(select 1 from public.friends f where f.user_id=target and f.friend_id=viewer),
  'library',coalesce((select jsonb_agg(jsonb_build_object('game_id',game_id,'seconds_played',seconds_played,'last_played',last_played)) from public.zh_library where user_id=target),'[]'))
 into result from (select target user_id) x left join public.zh_profiles p using(user_id) left join public.leaderboard l using(user_id);
 return result;
end $$;
revoke all on function zone_hub_private.profile(uuid,uuid) from public,anon,authenticated;

create or replace function zone_hub_private.command(action text,args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();target uuid;game text;doc jsonb;post public.zh_profile_comments;run zone_hub_private.play_sessions;runid uuid;delta integer;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501'; end if;
 if jsonb_typeof(args)<>'object' or octet_length(args::text)>8192 then raise exception 'HUB_INPUT'; end if;
 if action='home' then
  insert into public.zh_profiles(user_id) values(uid) on conflict do nothing;
  return jsonb_build_object('catalog',(select coalesce(jsonb_agg(to_jsonb(g) order by g.title),'[]') from public.zh_games g where published),
   'library',(select coalesce(jsonb_agg(to_jsonb(l) order by l.added_at),'[]') from public.zh_library l where user_id=uid),
   'definitions',(select coalesce(jsonb_agg(to_jsonb(d) order by d.id),'[]') from public.zh_achievement_definitions d join public.zh_games g on g.id=d.game_id where g.published),
   'profile',zone_hub_private.profile(uid,uid));
 elsif action='add_game' then
  game:=args->>'game_id';if not exists(select 1 from public.zh_games where id=game and free and published) then raise exception 'HUB_GAME'; end if;
  insert into public.zh_library(user_id,game_id) values(uid,game) on conflict do nothing;return '{}'::jsonb;
 elsif action='profile' then
  target:=coalesce((args->>'id')::uuid,uid);
  if not exists(select 1 from auth.users where id=target) then raise exception 'HUB_PROFILE'; end if;
  return jsonb_build_object('profile',zone_hub_private.profile(target,uid),'comments',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from (
   select c.id,c.profile_id,c.author_id,c.body,c.created_at,coalesce(l.name,'Player') name,l.avimg image from public.zh_profile_comments c left join public.leaderboard l on l.user_id=c.author_id where c.profile_id=target order by c.created_at desc limit 40) c),'[]'));
 elsif action='search' then
  if length(btrim(coalesce(args->>'name','')))<2 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(to_jsonb(x)) from (select user_id id,name,avimg image from public.leaderboard where lower(name) like '%'||replace(replace(replace(lower(left(btrim(args->>'name'),32)),'\','\\'),'%','\%'),'_','\_')||'%' escape '\' order by name limit 20) x),'[]');
 elsif action='edit_profile' then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,821));
  doc:=zone_hub_private.profile(uid,uid);
  if length(coalesce(args->>'bio',''))>500 or args->>'comments' not in ('everyone','friends','off') or args->>'accent' not in ('violet','ocean','ember','forest') or jsonb_typeof(args->'pinned')<>'array' or jsonb_array_length(args->'pinned')>3 then raise exception 'HUB_INPUT'; end if;
  if exists(select 1 from jsonb_array_elements_text(args->'pinned') pin where not (doc->'achievements' ? pin)) then raise exception 'HUB_BADGE'; end if;
  insert into public.zh_profiles(user_id,bio,comments,accent,pinned) values(uid,btrim(coalesce(args->>'bio','')),args->>'comments',args->>'accent',array(select distinct jsonb_array_elements_text(args->'pinned'))) on conflict(user_id) do update set bio=excluded.bio,comments=excluded.comments,accent=excluded.accent,pinned=excluded.pinned;
  return '{}'::jsonb;
 elsif action='comment' then
  target:=(args->>'id')::uuid;perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,821));
  doc:=zone_hub_private.profile(target,uid);if not coalesce((doc->>'canComment')::boolean,false) then raise exception 'HUB_COMMENTS_OFF'; end if;
  if length(btrim(coalesce(args->>'body',''))) not between 1 and 600 then raise exception 'HUB_COMMENT'; end if;
  if (select count(*) from public.zh_profile_comments where author_id=uid and created_at>now()-interval '1 minute')>=3 or (select count(*) from public.zh_profile_comments where author_id=uid and created_at>now()-interval '1 day')>=100 then raise exception 'HUB_RATE'; end if;
  insert into public.zh_profile_comments(profile_id,author_id,body) values(target,uid,btrim(args->>'body'));return '{}'::jsonb;
 elsif action='delete_comment' then
  delete from public.zh_profile_comments where id=(args->>'id')::uuid and uid in (author_id,profile_id);if not found then raise exception 'HUB_FORBIDDEN' using errcode='42501'; end if;return '{}'::jsonb;
 elsif action='play_start' then
  game:=args->>'game_id';runid:=(args->>'id')::uuid;
  if not exists(select 1 from public.zh_library where user_id=uid and game_id=game) then raise exception 'HUB_LIBRARY'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,822));
  update zone_hub_private.play_sessions set closed=true where user_id=uid and not closed;
  insert into zone_hub_private.play_sessions(id,user_id,game_id) values(runid,uid,game);
  update public.zh_library set last_played=now() where user_id=uid and game_id=game;return '{}'::jsonb;
 elsif action in ('play_tick','play_end') then
  select * into run from zone_hub_private.play_sessions where id=(args->>'id')::uuid and user_id=uid for update;
  if not found or run.closed then return '{}'::jsonb; end if;
  delta:=least(90,greatest(0,floor(extract(epoch from now()-run.last_tick))::integer));
  update public.zh_library set seconds_played=seconds_played+delta where user_id=uid and game_id=run.game_id;
  update zone_hub_private.play_sessions set last_tick=now(),closed=action='play_end' where id=run.id;
  return '{}'::jsonb;
 end if;
 raise exception 'HUB_ACTION' using errcode='42501';
end $$;
revoke all on function zone_hub_private.command(text,jsonb) from public,anon,authenticated;
grant usage on schema zone_hub_private to authenticated;
grant execute on function zone_hub_private.command(text,jsonb) to authenticated;
create or replace function public.zone_hub(action text,args jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select zone_hub_private.command(action,args) $$;
revoke all on function public.zone_hub(text,jsonb) from public,anon;
grant execute on function public.zone_hub(text,jsonb) to authenticated;
