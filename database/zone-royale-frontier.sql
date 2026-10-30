-- Separate the expanded Frontier geometry from the still-running original island.
-- Apply after zone-royale-matchmaking.sql and zone-royale-ranked-upgrade.sql.
alter table zone_royale_private.matches add column if not exists world_revision integer not null default 1 check(world_revision in (1,2));
create index if not exists zr_waiting_world on zone_royale_private.matches(mode,ranked,protocol,world_revision,map,closes_at) where phase='waiting';
do $upgrade$
declare body text;
begin
 body:=pg_get_functiondef('zone_royale_private.command(text,jsonb)'::regprocedure);
 if strpos(body,'world_revision integer')>0 then return;end if;
 if strpos(body,'ranked boolean')=0 or strpos(body,'result_roster')=0 then raise exception 'ZR_FRONTIER_SOURCE';end if;
 body:=replace(body,'protocol integer;mode text;','protocol integer;world_revision integer;mode text;');
 body:=replace(body,'if action=''join'' then','if action=''join'' then
  if args ? ''worldRevision'' and coalesce(args->>''worldRevision'','''') not in (''1'',''2'') then raise exception ''ZR_QUEUE_INPUT'';end if;
  world_revision:=coalesce((args->>''worldRevision'')::integer,1);');
 body:=replace(body,'m.ranked<>ranked then','m.ranked<>ranked or m.world_revision<>world_revision then');
 body:=replace(body,'x.ranked=ranked and x.map=','x.ranked=ranked and x.world_revision=world_revision and x.map=');
 body:=replace(body,'matches(id,room,mode,protocol,ranked,map,host_id,host_cid) values(new_id,new_room,mode,protocol,ranked,','matches(id,room,mode,protocol,ranked,world_revision,map,host_id,host_cid) values(new_id,new_room,mode,protocol,ranked,world_revision,');
 body:=replace(body,'''protocol'',m.protocol,''id''','''protocol'',m.protocol,''worldRevision'',m.world_revision,''id''');
 if strpos(body,'world_revision integer')=0 or strpos(body,'x.world_revision=world_revision')=0 or strpos(body,'''worldRevision'',m.world_revision')=0 then raise exception 'ZR_FRONTIER_SOURCE';end if;
 execute body;
end $upgrade$;
