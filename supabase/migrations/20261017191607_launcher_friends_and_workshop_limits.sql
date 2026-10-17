-- Existing accounts and game saves stay unchanged. Public profile images are optional.
alter table public.leaderboard add column if not exists avimg text;
alter table public.leaderboard add constraint leaderboard_avatar_raster check (avimg is null or (length(avimg)<=24000 and avimg ~* '^data:image/(png|jpeg|webp);base64,[a-z0-9+/=]+$'));

create or replace function sz_workshop_private.prepare_submission() returns trigger
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

notify pgrst, 'reload schema';
