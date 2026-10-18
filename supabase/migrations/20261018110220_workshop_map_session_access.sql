-- Sessions are accessible only through the validated private RPC implementation.
create policy workshop_map_sessions_locked on sz_workshop_private.map_sessions
 for all to anon,authenticated using(false) with check(false);
