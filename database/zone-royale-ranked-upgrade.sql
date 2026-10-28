-- Idempotent upgrade from the already installed protocol-4 queue.
alter table zone_royale_private.matches add column if not exists ranked boolean not null default false;
alter table zone_royale_private.matches add column if not exists result_roster jsonb not null default '[]';
alter table zone_royale_private.matches drop constraint if exists matches_protocol_check;
alter table zone_royale_private.matches add constraint matches_protocol_check check(protocol in(2,3,4,5));
create index if not exists zr_waiting_ranked on zone_royale_private.matches(mode,ranked,protocol,map,closes_at) where phase='waiting';
do $upgrade$ declare body text;begin body:=pg_get_functiondef('zone_royale_private.command(text,jsonb)'::regprocedure);if strpos(body,'result_roster')>0 then return;end if;
body:=replace(body,'expected integer;fill boolean;','expected integer;fill boolean;ranked boolean;');
body:=replace(body,'in (''3'',''4'')','in (''3'',''4'',''5'')');
body:=replace(body,'ticket:=(args->>''party'')::uuid;','if args ? ''ranked'' and jsonb_typeof(args->''ranked'')<>''boolean'' then raise exception ''ZR_QUEUE_INPUT'';end if;ranked:=protocol=5 and coalesce((args->>''ranked'')::boolean,false);ticket:=(args->>''party'')::uuid;');
body:=replace(body,'m.protocol<>protocol then','m.protocol<>protocol or m.ranked<>ranked then');
body:=replace(body,'x.protocol=protocol and x.map=','x.protocol=protocol and x.ranked=ranked and x.map=');
body:=replace(body,'matches(id,room,mode,protocol,map,host_id,host_cid) values(new_id,new_room,mode,protocol,','matches(id,room,mode,protocol,ranked,map,host_id,host_cid) values(new_id,new_room,mode,protocol,ranked,');
body:=replace(body,'set phase=''running'' where id=m.id returning * into m;','set phase=''running'',result_roster=(select jsonb_agg(jsonb_build_object(''uid'',x.user_id,''cid'',x.cid,''team'',p.team)) from zone_royale_private.members x join zone_royale_private.parties p on p.match_id=x.match_id and p.ticket=x.ticket where x.match_id=m.id) where id=m.id returning * into m;');
body:=replace(body,'''mode'',m.mode,''map''','''mode'',m.mode,''ranked'',m.ranked,''map''');
if strpos(body,'ranked boolean')=0 or strpos(body,'result_roster')=0 or strpos(body,'x.ranked=ranked')=0 then raise exception 'ZR_QUEUE_UPGRADE_SOURCE';end if;execute body;end $upgrade$;

