-- Bonus definitions are edited only through Supabase Dashboard / trusted administration.
create schema if not exists sz_bonus_private;
revoke all on schema sz_bonus_private from public;
grant usage on schema sz_bonus_private to authenticated,service_role;

create table public.bonus_codes (
 id uuid primary key default gen_random_uuid(),
 code text not null check (upper(btrim(code)) ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'),
 normalized_code text generated always as (upper(btrim(code))) stored unique,
 reward_type text not null default 'money' check (reward_type in ('candies','money','case','key')),
 reward_amount integer not null default 1 check (reward_amount between 1 and 1000000),
 reward_item text,
 active boolean not null default true,
 starts_at timestamptz not null default now(),
 expires_at timestamptz,
 max_redemptions integer check (max_redemptions > 0),
 used_count integer not null default 0 check (used_count >= 0),
 created_at timestamptz not null default now(),
 constraint bonus_codes_candy_code check ((normalized_code='HALLOWEEN')=(reward_type='candies')),
 constraint bonus_codes_reward_item check ((reward_type in ('candies','money') and reward_item is null) or (reward_type in ('case','key') and reward_item is not null and reward_item in ('alpha','spectrum','dragon','chroma','prisma','riptide','drop','supply','gloves','music'))),
 check (expires_at is null or expires_at > starts_at)
);
create table public.bonus_code_redemptions (
 id uuid primary key default gen_random_uuid(),
 code_id uuid not null references public.bonus_codes(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 code_label text not null,
 profile_name text not null,
 reward_type text not null check (reward_type in ('candies','money','case','key')),
 reward_amount integer not null check (reward_amount between 1 and 1000000),
 reward_item text,
 redeemed_at timestamptz not null default now(),
 constraint bonus_redemptions_reward_item check ((reward_type in ('candies','money') and reward_item is null) or (reward_type in ('case','key') and reward_item is not null and reward_item in ('alpha','spectrum','dragon','chroma','prisma','riptide','drop','supply','gloves','music'))),
 unique (code_id,user_id)
);
create index bonus_redemptions_user_date on public.bonus_code_redemptions(user_id,redeemed_at desc);
alter table public.bonus_codes enable row level security;
alter table public.bonus_code_redemptions enable row level security;
revoke all on public.bonus_codes,public.bonus_code_redemptions from anon,authenticated;
grant all on public.bonus_codes,public.bonus_code_redemptions to service_role;
grant select on public.bonus_code_redemptions to authenticated;
create policy bonus_codes_admin on public.bonus_codes for all to service_role using (true) with check (true);
create policy bonus_redemptions_own on public.bonus_code_redemptions for select to authenticated using (user_id=(select auth.uid()));

-- The private definer is required to read non-public definitions and atomically
-- update the protected receipt ledger. The public RPC itself is an invoker.
create or replace function sz_bonus_private.redeem(code_input text,profile_name text,expected_ts bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); label text:=upper(btrim(code_input)); c public.bonus_codes;
 saved jsonb; profile jsonb; event jsonb; receipt public.bonus_code_redemptions;
 current_ts bigint; next_ts bigint; balance numeric; earned bigint; field text; legacy text;
begin
 if uid is null then raise exception 'BONUS_AUTH_REQUIRED'; end if;
 if label is null or label !~ '^[A-Z0-9][A-Z0-9_-]{2,39}$' then raise exception 'BONUS_INVALID'; end if;
 select * into c from public.bonus_codes where normalized_code=label for update;
 if not found then raise exception 'BONUS_INVALID'; end if;
 select json into saved from public.saves where user_id=uid for update;
 if not found or jsonb_typeof(saved->'profiles') is distinct from 'object' then raise exception 'BONUS_SAVE_REQUIRED'; end if;
 select * into receipt from public.bonus_code_redemptions where code_id=c.id and user_id=uid;
 if found then return jsonb_build_object('status','already_used','code',receipt.code_label,'reward',receipt.reward_amount,'reward_type',receipt.reward_type,'reward_item',receipt.reward_item,'receipt_id',receipt.id,'save',saved); end if;
 if not c.active or c.starts_at>clock_timestamp() then raise exception 'BONUS_NOT_ACTIVE'; end if;
 if c.expires_at is not null and clock_timestamp()>=c.expires_at then raise exception 'BONUS_EXPIRED'; end if;
 if c.max_redemptions is not null and c.used_count>=c.max_redemptions then raise exception 'BONUS_EXHAUSTED'; end if;
 if expected_ts is null or expected_ts<0 or expected_ts>9007199254740990 or coalesce(saved->>'ts','0') !~ '^[0-9]+$' then raise exception 'BONUS_STALE_SAVE'; end if;
 current_ts:=coalesce(saved->>'ts','0')::bigint;
 if current_ts<>expected_ts then raise exception 'BONUS_STALE_SAVE'; end if;
 if profile_name is null or length(profile_name)>100 or jsonb_typeof(saved#>array['profiles',profile_name]) is distinct from 'object' then raise exception 'BONUS_PROFILE'; end if;
 profile:=saved#>array['profiles',profile_name];
 if c.reward_type='candies' then
  -- The table constraint also enforces that HALLOWEEN is the only candy code.
  if label<>'HALLOWEEN' then raise exception 'BONUS_INVALID';end if;
  event:=profile->'halloween2026';
  if event is null then event:=jsonb_build_object('version',1,'candies',0,'earned',0,'spent',0,'stats',jsonb_build_object('seconds',0,'matches',0,'wins',0,'kills',0),'day',to_char(clock_timestamp() at time zone 'Europe/Warsaw','YYYY-MM-DD'),'daily',jsonb_build_object('seconds',0,'matches',0,'wins',0,'kills',0),'claimed','[]'::jsonb,'milestones','[]'::jsonb,'results','[]'::jsonb,'history','[]'::jsonb,'inventory','[]'::jsonb,'loadout','{}'::jsonb);end if;
  if jsonb_typeof(event) is distinct from 'object' or event->>'version' is distinct from '1' or coalesce(event->>'candies','0') !~ '^[0-9]{1,13}$' or coalesce(event->>'earned','0') !~ '^[0-9]{1,13}$' then raise exception 'BONUS_SAVE_REQUIRED';end if;
  balance:=coalesce(event->>'candies','0')::bigint+c.reward_amount;earned:=coalesce(event->>'earned','0')::bigint+c.reward_amount;
  event:=jsonb_set(jsonb_set(event,'{candies}',to_jsonb(balance)),'{earned}',to_jsonb(earned));
  profile:=jsonb_set(profile,'{halloween2026}',event);
 elsif c.reward_type='money' then
  if jsonb_typeof(profile->'wallet') is distinct from 'number' then raise exception 'BONUS_SAVE_REQUIRED';end if;
  balance:=(profile->>'wallet')::numeric;
  if balance<0 or balance>9007199254740991-c.reward_amount then raise exception 'BONUS_SAVE_REQUIRED';end if;
  profile:=jsonb_set(profile,'{wallet}',to_jsonb(balance+c.reward_amount));
 elsif c.reward_type in ('case','key') then
  -- Import both legacy Alpha counters before the modern inventory is initialized.
  foreach field in array array['cs','ks'] loop
   if profile->field is null or profile->field='null'::jsonb then
    legacy:=case when field='cs' then 'cases' else 'keys' end;
    if coalesce(profile->>legacy,'0') !~ '^[0-9]{1,13}$' then raise exception 'BONUS_SAVE_REQUIRED';end if;
    profile:=jsonb_set(profile,array[field],jsonb_build_object('alpha',coalesce(profile->>legacy,'0')::bigint));
   elsif jsonb_typeof(profile->field) is distinct from 'object' then raise exception 'BONUS_SAVE_REQUIRED';end if;
  end loop;
  field:=case when c.reward_type='case' then 'cs' else 'ks' end;
  if coalesce(profile#>>array[field,c.reward_item],'0') !~ '^[0-9]{1,13}$' then raise exception 'BONUS_SAVE_REQUIRED';end if;
  balance:=coalesce(profile#>>array[field,c.reward_item],'0')::bigint+c.reward_amount;
  profile:=jsonb_set(profile,array[field,c.reward_item],to_jsonb(balance));
 else raise exception 'BONUS_INVALID';
 end if;
 saved:=jsonb_set(saved,array['profiles',profile_name],profile);
 next_ts:=greatest(current_ts+1,floor(extract(epoch from clock_timestamp())*1000)::bigint);
 saved:=jsonb_set(saved,'{ts}',to_jsonb(next_ts));
 update public.saves set json=saved,updated_at=clock_timestamp() where user_id=uid;
 insert into public.bonus_code_redemptions(code_id,user_id,code_label,profile_name,reward_type,reward_amount,reward_item)
 values(c.id,uid,label,profile_name,c.reward_type,c.reward_amount,c.reward_item) returning * into receipt;
 update public.bonus_codes set used_count=used_count+1 where id=c.id;
 return jsonb_build_object('status','redeemed','code',label,'reward',receipt.reward_amount,'reward_type',receipt.reward_type,'reward_item',receipt.reward_item,'receipt_id',receipt.id,'save',saved);
end;
$$;
revoke all on function sz_bonus_private.redeem(text,text,bigint) from public,anon;
grant execute on function sz_bonus_private.redeem(text,text,bigint) to authenticated;
create function public.sz_bonus_redeem(code_input text,profile_name text,expected_ts bigint) returns jsonb
language sql security invoker set search_path='' as $$select sz_bonus_private.redeem(code_input,profile_name,expected_ts)$$;
revoke all on function public.sz_bonus_redeem(text,text,bigint) from public,anon;
grant execute on function public.sz_bonus_redeem(text,text,bigint) to authenticated;

insert into public.bonus_codes(code,reward_type,reward_amount,starts_at,expires_at)
values('HALLOWEEN','candies',80,'2026-10-19 22:00:00+00','2026-11-30 23:00:00+00');
