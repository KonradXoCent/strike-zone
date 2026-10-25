-- Additive mode support; existing authors, admin checks, quotas and pinned releases are preserved.
create or replace function sz_workshop_private.project_valid(kind text,p jsonb,paths boolean default false) returns boolean
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
  if (p->>'width') is distinct from '1536' or (p->>'height') is distinct from '1024' or coalesce(p->>'theme','')<>all(array['industrial','desert','forest'])
    or coalesce(p->>'mode','tdm')<>all(array['classic','tdm','ctf','football','zombie','prophunt']) then return false; end if;
  foreach k in array array['walls','covers','windows','spawns','sites'] loop
    lim:=case k when 'walls' then 192 when 'covers' then 48 when 'windows' then 32 else 2 end;
    if jsonb_typeof(p->k) is distinct from 'array' or jsonb_array_length(p->k)>lim then return false; end if;
    if (k='spawns' or k='sites' and coalesce(p->>'mode','tdm') not in ('zombie','prophunt')) and jsonb_array_length(p->k)<>2 then return false; end if;
    for r in select * from jsonb_array_elements(p->k) loop
      if not sz_workshop_private.rect_valid(r) then return false; end if;
      if k in ('spawns','sites') and ((r->>2)::integer<96 or (r->>3)::integer<96) then return false; end if;
    end loop;
  end loop;
  if coalesce(p->>'mode','tdm') in ('zombie','prophunt') and jsonb_array_length(p->'sites')<>0 then return false;end if;
  if coalesce(p->>'mode','tdm')='football' then
   if p->'sites'<>'[[64,416,96,192],[1376,416,96,192]]'::jsonb or (p->'spawns'->0->>0)::int+(p->'spawns'->0->>2)::int>704 or (p->'spawns'->1->>0)::int<832 then return false;end if;
  end if;
  if p ? 'props' and (jsonb_typeof(p->'props') is distinct from 'array' or jsonb_array_length(p->'props')>160) then return false;end if;
  if coalesce(p->>'mode','tdm')='prophunt' then
   if jsonb_typeof(p->'props') is distinct from 'array' or jsonb_array_length(p->'props')<24 then return false;end if;
   for r in select * from jsonb_array_elements(p->'props') loop
    if jsonb_typeof(r) is distinct from 'object' or coalesce(r->>'form','')<>all(array['crate','barrel','tire','toolcase','pallet','pot','rock','bush','chair','suitcase','bin'])
      or jsonb_typeof(r->'x') is distinct from 'number' or jsonb_typeof(r->'y') is distinct from 'number'
      or (r->>'x')::numeric%16<>0 or (r->>'y')::numeric%16<>0 or (r->>'x')::numeric not between 64 and 1472 or (r->>'y')::numeric not between 64 and 960
      or coalesce((r->>'a')::numeric,0)<>0 then return false;end if;
   end loop;
   if (select count(distinct prop_value->>'form') from jsonb_array_elements(p->'props') as prop_rows(prop_value))<2 then return false;end if;
  elsif coalesce(jsonb_array_length(p->'props'),0)>0 then return false;end if;
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
  if p->>'mode'='prophunt' then
   for r in select * from jsonb_array_elements(p->'props') loop
    for y in ((r->>'y')::int-32)/16..((r->>'y')::int+32)/16-1 loop for x in ((r->>'x')::int-32)/16..((r->>'x')::int+32)/16-1 loop grid[1+y*96+x]:=1;end loop;end loop;
   end loop;
  end if;
  for y in 0..63 loop for x in 0..95 loop
    for yy in y-1..y+1 loop for xx in x-1..x+1 loop
      if xx<0 or yy<0 or xx>95 or yy>63 or grid[1+yy*96+xx]>0 then blocked[1+y*96+x]:=true; end if;
    end loop; end loop;
  end loop; end loop;
  targets:=(p->'spawns')||(p->'sites');if p->>'mode'='football' then targets:=targets||'[[704,448,128,128]]'::jsonb;end if;
  for a in 0..jsonb_array_length(targets)-1 loop
    r:=targets->a;v:=array[(r->>0)::integer,(r->>1)::integer,(r->>2)::integer,(r->>3)::integer];
    for y in v[2]/16..(v[2]+v[4])/16-1 loop for x in v[1]/16..(v[1]+v[3])/16-1 loop if blocked[1+y*96+x] then return false; end if; end loop; end loop;
    for b in a+1..jsonb_array_length(targets)-1 loop
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
alter table public.sz_workshop_map_stats drop constraint sz_workshop_map_stats_mode_check;
alter table public.sz_workshop_map_stats add constraint sz_workshop_map_stats_mode_check check(mode in ('classic','tdm','ctf','football','zombie','prophunt'));
alter table sz_workshop_private.map_sessions drop constraint map_sessions_mode_check;
alter table sz_workshop_private.map_sessions add constraint map_sessions_mode_check check(mode in ('classic','tdm','ctf','football','zombie','prophunt'));
create or replace function sz_workshop_private.sync_map_release() returns trigger language plpgsql security definer set search_path='' as $$
declare md text; previous public.sz_workshop_map_stats%rowtype;
begin
 if not exists(select 1 from public.sz_workshop_items i where i.id=new.item_id and i.kind='map' and i.latest_version=new.version) then return new; end if;
 md:=coalesce(new.payload->>'mode','tdm');if md not in ('classic','tdm','ctf','football','zombie','prophunt') then raise exception 'WORKSHOP_INVALID_PROJECT'; end if;
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
revoke execute on function sz_workshop_private.project_valid(text,jsonb,boolean) from public,anon,authenticated;
