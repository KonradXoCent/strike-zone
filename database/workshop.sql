-- Community Workshop. Additive schema: existing saves, accounts and inventory stay untouched.
create schema if not exists sz_workshop_private;
revoke all on schema sz_workshop_private from public, anon;
grant usage on schema sz_workshop_private to authenticated;

create table public.sz_workshop_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.sz_workshop_admins enable row level security;
revoke all on public.sz_workshop_admins from public, anon, authenticated;
grant select on public.sz_workshop_admins to authenticated;
create policy workshop_own_admin on public.sz_workshop_admins for select to authenticated using (user_id=(select auth.uid()));

create table sz_workshop_private.owner_invite (
  singleton boolean primary key default true check(singleton),
  token_hash bytea not null,
  expires_at timestamptz not null,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz
);
alter table sz_workshop_private.owner_invite enable row level security;
revoke all on sz_workshop_private.owner_invite from public, anon, authenticated;
create policy workshop_invite_locked on sz_workshop_private.owner_invite for all to anon,authenticated using(false) with check(false);

create table public.sz_workshop_submissions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null default 'Gracz',
  project_id text not null check (project_id ~ '^[a-zA-Z0-9-]{1,50}$'),
  kind text not null check(kind in ('map','skin')),
  title text not null default '',
  description text not null default '' check(length(description)<=600),
  payload jsonb not null check(octet_length(payload::text)<=250000),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  review_note text not null default '' check(length(review_note)<=500),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index workshop_author_created on public.sz_workshop_submissions(author_id,created_at desc);
create index workshop_pending_queue on public.sz_workshop_submissions(created_at) where status='pending';
create unique index workshop_one_pending_project on public.sz_workshop_submissions(author_id,kind,project_id) where status='pending';
create index workshop_reviewer on public.sz_workshop_submissions(reviewed_by) where reviewed_by is not null;
alter table public.sz_workshop_submissions enable row level security;
revoke all on public.sz_workshop_submissions from public,anon,authenticated;
grant select on public.sz_workshop_submissions to authenticated;
grant insert(id,project_id,kind,payload,description) on public.sz_workshop_submissions to authenticated;
create policy workshop_submission_read on public.sz_workshop_submissions for select to authenticated
  using(author_id=(select auth.uid()) or exists(select 1 from public.sz_workshop_admins a where a.user_id=(select auth.uid())));
create policy workshop_submission_insert on public.sz_workshop_submissions for insert to authenticated
  with check(author_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null and review_note='');

create table public.sz_workshop_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null,
  kind text not null check(kind in ('map','skin')),
  title text not null,
  author_name text not null,
  latest_version integer not null check(latest_version>0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,kind,project_id)
);
create index workshop_catalog_kind on public.sz_workshop_items(kind,updated_at desc) where active;
alter table public.sz_workshop_items enable row level security;
revoke all on public.sz_workshop_items from public,anon,authenticated;
grant select(id,kind,title,author_name,latest_version,active,created_at,updated_at) on public.sz_workshop_items to anon,authenticated;
create policy workshop_published_items on public.sz_workshop_items for select to anon,authenticated using(active);

create table public.sz_workshop_releases (
  id uuid primary key references public.sz_workshop_submissions(id),
  item_id uuid not null references public.sz_workshop_items(id) on delete cascade,
  version integer not null,
  payload jsonb not null,
  published_at timestamptz not null default now(),
  unique(item_id,version)
);
alter table public.sz_workshop_releases enable row level security;
revoke all on public.sz_workshop_releases from public,anon,authenticated;
grant select on public.sz_workshop_releases to anon,authenticated;
create policy workshop_published_releases on public.sz_workshop_releases for select to anon,authenticated
  using(exists(select 1 from public.sz_workshop_items i where i.id=item_id and i.active));

create view public.sz_workshop_catalog with(security_invoker=true) as
select i.id,i.kind,i.title,i.author_name,i.latest_version as version,r.id as release_id,i.updated_at,
  r.payload->>'weapon' as weapon,r.payload->>'model' as model,r.payload->>'theme' as theme
from public.sz_workshop_items i join public.sz_workshop_releases r on r.item_id=i.id and r.version=i.latest_version
where i.active;
grant select on public.sz_workshop_catalog to anon,authenticated;

create function sz_workshop_private.rect_valid(r jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare v integer[]; x jsonb;
begin
  if jsonb_typeof(r) is distinct from 'array' or jsonb_array_length(r)<>4 then return false; end if;
  for x in select * from jsonb_array_elements(r) loop
    if jsonb_typeof(x) is distinct from 'number' or (x::text)::numeric%16<>0 then return false; end if;
    v:=array_append(v,(x::text)::integer);
  end loop;
  return v[1]>=32 and v[2]>=32 and v[3]>=16 and v[4]>=16 and v[1]+v[3]<=1504 and v[2]+v[4]<=992;
exception when others then return false;
end $$;

create function sz_workshop_private.project_valid(kind text,p jsonb,paths boolean default false) returns boolean
language plpgsql immutable set search_path='' as $$
declare k text; lim integer; r jsonb; s jsonb; pt jsonb; c jsonb; v integer[]; targets jsonb; a integer; b integer;
  grid integer[]:=array_fill(0,array[6144]); blocked boolean[]:=array_fill(false,array[6144]);
  seen boolean[]:=array_fill(false,array[6144]); queue integer[]:=array_fill(0,array[6144]);
  x integer; y integer; xx integer; yy integer; idx integer; nxt integer; start integer; head integer:=1; tail integer:=0;
begin
  if jsonb_typeof(p) is distinct from 'object' or (p->>'kind') is distinct from ('sz-'||kind) or (p->>'version') is distinct from '1'
    or coalesce(p->>'id','')!~'^[a-zA-Z0-9-]{1,50}$'
    or jsonb_typeof(p->'name') is distinct from 'string' or length(p->>'name') not between 1 and 40
    or p->>'name' ~ '[<>[:cntrl:]]' or octet_length(p::text)>250000 then return false; end if;
  if kind='skin' then
    if coalesce(p->>'weapon','')<>all(array['knife','glock','usp','deagle','elite','fiveseven','tec9','cz75','r8','mac10','mp7','p90','bizon','xm1014','mag7','sawed','m249','negev','galil','famas','sg553','aug','ssg','g3sg1','scar20','p250','ump','mp9','nova','ak','m4','awp'])
      or coalesce(p->>'model','')<>all(array['classic','karambit','m9','machete','butterfly','pickaxe','kukri','stiletto'])
      or coalesce(p->>'pattern','')<>all(array['solid','fade','stripes','camo','digital','web'])
      or jsonb_typeof(p->'colors') is distinct from 'array' or jsonb_array_length(p->'colors')<>3
      or jsonb_typeof(p->'strokes') is distinct from 'array' or jsonb_array_length(p->'strokes')>80 then return false; end if;
    for c in select * from jsonb_array_elements(p->'colors') loop
      if jsonb_typeof(c) is distinct from 'string' or (c#>>'{}')!~'^#[0-9a-fA-F]{6}$' then return false; end if;
    end loop;
    for s in select * from jsonb_array_elements(p->'strokes') loop
      if jsonb_typeof(s) is distinct from 'object' or coalesce(s->>'color','')!~'^#[0-9a-fA-F]{6}$'
        or jsonb_typeof(s->'size') is distinct from 'number' or (s->>'size')::numeric not between .5 and 12
        or jsonb_typeof(s->'points') is distinct from 'array' or jsonb_array_length(s->'points') not between 1 and 120 then return false; end if;
      for pt in select * from jsonb_array_elements(s->'points') loop
        if jsonb_typeof(pt) is distinct from 'array' or jsonb_array_length(pt)<>2 then return false; end if;
        for c in select * from jsonb_array_elements(pt) loop
          if jsonb_typeof(c) is distinct from 'number' or (c::text)::numeric not between -32 and 120 then return false; end if;
        end loop;
      end loop;
    end loop;
    return true;
  elsif kind<>'map' then return false; end if;
  if (p->>'width') is distinct from '1536' or (p->>'height') is distinct from '1024' or coalesce(p->>'theme','')<>all(array['industrial','desert','forest']) then return false; end if;
  foreach k in array array['walls','covers','windows','spawns','sites'] loop
    lim:=case k when 'walls' then 192 when 'covers' then 48 when 'windows' then 32 else 2 end;
    if jsonb_typeof(p->k) is distinct from 'array' or jsonb_array_length(p->k)>lim then return false; end if;
    if k in ('spawns','sites') and jsonb_array_length(p->k)<>2 then return false; end if;
    for r in select * from jsonb_array_elements(p->k) loop
      if not sz_workshop_private.rect_valid(r) then return false; end if;
      if k in ('spawns','sites') and ((r->>2)::integer<96 or (r->>3)::integer<96) then return false; end if;
    end loop;
  end loop;
  if not paths then return true; end if;
  -- Same 16-unit collision grid and one-cell actor clearance as the game.
  for y in 0..63 loop for x in 0..95 loop
    if x<2 or y<2 or x>=94 or y>=62 then grid[1+y*96+x]:=1; end if;
  end loop; end loop;
  foreach k in array array['walls','covers','windows'] loop
    for r in select * from jsonb_array_elements(p->k) loop
      v:=array[(r->>0)::integer,(r->>1)::integer,(r->>2)::integer,(r->>3)::integer];
      for y in v[2]/16..(v[2]+v[4])/16-1 loop for x in v[1]/16..(v[1]+v[3])/16-1 loop grid[1+y*96+x]:=1; end loop; end loop;
    end loop;
  end loop;
  for y in 0..63 loop for x in 0..95 loop
    for yy in y-1..y+1 loop for xx in x-1..x+1 loop
      if xx<0 or yy<0 or xx>95 or yy>63 or grid[1+yy*96+xx]>0 then blocked[1+y*96+x]:=true; end if;
    end loop; end loop;
  end loop; end loop;
  targets:=(p->'spawns')||(p->'sites');
  for a in 0..3 loop
    r:=targets->a;v:=array[(r->>0)::integer,(r->>1)::integer,(r->>2)::integer,(r->>3)::integer];
    for y in v[2]/16..(v[2]+v[4])/16-1 loop for x in v[1]/16..(v[1]+v[3])/16-1 loop if blocked[1+y*96+x] then return false; end if; end loop; end loop;
    for b in a+1..3 loop
      s:=targets->b;
      if v[1]<(s->>0)::integer+(s->>2)::integer and v[1]+v[3]>(s->>0)::integer and v[2]<(s->>1)::integer+(s->>3)::integer and v[2]+v[4]>(s->>1)::integer then return false; end if;
    end loop;
  end loop;
  r:=targets->0;start:=1+(((r->>1)::integer+(r->>3)::integer/2)/16)*96+((r->>0)::integer+(r->>2)::integer/2)/16;
  if blocked[start] then return false; end if;tail:=1;queue[1]:=start;seen[start]:=true;
  while head<=tail loop
    idx:=queue[head];head:=head+1;
    foreach nxt in array array[idx-1,idx+1,idx-96,idx+96] loop
      if nxt between 1 and 6144 and not blocked[nxt] and not seen[nxt] and (abs((nxt-1)%96-(idx-1)%96)<=1) then seen[nxt]:=true;tail:=tail+1;queue[tail]:=nxt; end if;
    end loop;
  end loop;
  for r in select * from jsonb_array_elements(targets) loop
    idx:=1+(((r->>1)::integer+(r->>3)::integer/2)/16)*96+((r->>0)::integer+(r->>2)::integer/2)/16;
    if not seen[idx] then return false; end if;
  end loop;
  return true;
exception when others then return false;
end $$;

create function sz_workshop_private.prepare_submission() returns trigger
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); pending_count integer; daily_count integer;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'WORKSHOP_LOGIN_REQUIRED' using errcode='42501'; end if;
  if new.author_id<>uid then raise exception 'WORKSHOP_NOT_OWNER' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,0));
  select count(*) filter(where status='pending'),count(*) filter(where created_at>now()-interval '24 hours') into pending_count,daily_count from public.sz_workshop_submissions where author_id=uid and (status='pending' or created_at>now()-interval '24 hours');
  if pending_count>=10 or daily_count>=10 then raise exception 'WORKSHOP_SUBMISSION_LIMIT' using errcode='P0001'; end if;
  if not sz_workshop_private.project_valid(new.kind,new.payload,new.kind='map') or new.project_id<>new.payload->>'id' then raise exception 'WORKSHOP_INVALID_PROJECT' using errcode='22023'; end if;
  new.author_id:=uid;new.status:='pending';new.reviewed_at:=null;new.reviewed_by:=null;new.review_note:='';new.created_at:=now();new.title:=new.payload->>'name';
  select left(regexp_replace(coalesce(name,'Gracz'),'[<>[:cntrl:]]','','g'),40) into new.author_name from public.leaderboard where user_id=uid;
  new.author_name:=coalesce(nullif(new.author_name,''),'Gracz');return new;
end $$;
create trigger workshop_prepare before insert on public.sz_workshop_submissions for each row execute function sz_workshop_private.prepare_submission();

create function sz_workshop_private.review_submission(submission uuid,decision text,note text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); s public.sz_workshop_submissions%rowtype; item uuid; ver integer;
begin
  if uid is null or not exists(select 1 from public.sz_workshop_admins where user_id=uid) then raise exception 'WORKSHOP_ADMIN_REQUIRED' using errcode='42501'; end if;
  if coalesce(decision,'') not in ('approved','rejected') or note is null or length(note)>500 or (decision='rejected' and length(trim(note))=0) then raise exception 'WORKSHOP_REVIEW_NOTE_REQUIRED' using errcode='22023'; end if;
  select * into s from public.sz_workshop_submissions where id=submission for update;
  if not found then raise exception 'WORKSHOP_NOT_FOUND' using errcode='P0002'; end if;
  if s.status<>'pending' then
    if s.status=decision and s.review_note=note then return (select item_id from public.sz_workshop_releases where id=s.id); end if;
    raise exception 'WORKSHOP_ALREADY_REVIEWED' using errcode='40001';
  end if;
  if decision='approved' then
    if not sz_workshop_private.project_valid(s.kind,s.payload,true) then raise exception 'WORKSHOP_INVALID_PROJECT' using errcode='22023'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(s.author_id::text||s.kind||s.project_id,0));
    insert into public.sz_workshop_items(owner_id,project_id,kind,title,author_name,latest_version)
      values(s.author_id,s.project_id,s.kind,s.title,s.author_name,1)
      on conflict(owner_id,kind,project_id) do update set title=excluded.title,author_name=excluded.author_name,latest_version=sz_workshop_items.latest_version+1,active=true,updated_at=now()
      returning id,latest_version into item,ver;
    insert into public.sz_workshop_releases(id,item_id,version,payload) values(s.id,item,ver,s.payload);
  end if;
  update public.sz_workshop_submissions set status=decision,review_note=note,reviewed_by=uid,reviewed_at=now() where id=s.id;
  return item;
end $$;

create function sz_workshop_private.claim_owner(code text) returns boolean
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); inv sz_workshop_private.owner_invite%rowtype;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'WORKSHOP_LOGIN_REQUIRED' using errcode='42501'; end if;
  if exists(select 1 from public.sz_workshop_admins where user_id=uid) then return true; end if;
  select * into inv from sz_workshop_private.owner_invite where singleton=true for update;
  if not found or inv.claimed_at is not null or inv.expires_at<now() or coalesce(code,'') !~ '^[a-f0-9]{64}$' or inv.token_hash<>pg_catalog.sha256(pg_catalog.convert_to(code,'UTF8')) then raise exception 'WORKSHOP_INVALID_OWNER_CODE' using errcode='42501'; end if;
  insert into public.sz_workshop_admins(user_id) values(uid);
  update sz_workshop_private.owner_invite set claimed_by=uid,claimed_at=now() where singleton=true;
  return true;
end $$;

create function sz_workshop_private.withdraw_item(item uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
  if uid is null or not exists(select 1 from public.sz_workshop_admins where user_id=uid) then raise exception 'WORKSHOP_ADMIN_REQUIRED' using errcode='42501'; end if;
  update public.sz_workshop_items set active=false,updated_at=now() where id=item;return found;
end $$;

revoke execute on all functions in schema sz_workshop_private from public,anon,authenticated;
grant execute on function sz_workshop_private.review_submission(uuid,text,text),sz_workshop_private.claim_owner(text),sz_workshop_private.withdraw_item(uuid) to authenticated;
create function public.sz_workshop_review(submission uuid,decision text,note text default '') returns uuid
language sql security invoker set search_path='' as $$ select sz_workshop_private.review_submission(submission,decision,note); $$;
create function public.sz_workshop_claim_owner(code text) returns boolean
language sql security invoker set search_path='' as $$ select sz_workshop_private.claim_owner(code); $$;
create function public.sz_workshop_withdraw(item uuid) returns boolean
language sql security invoker set search_path='' as $$ select sz_workshop_private.withdraw_item(item); $$;
revoke execute on function public.sz_workshop_review(uuid,text,text),public.sz_workshop_claim_owner(text),public.sz_workshop_withdraw(uuid) from public,anon;
grant execute on function public.sz_workshop_review(uuid,text,text),public.sz_workshop_claim_owner(text),public.sz_workshop_withdraw(uuid) to authenticated;
notify pgrst,'reload schema';
