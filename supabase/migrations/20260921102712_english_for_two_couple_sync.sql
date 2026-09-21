-- Only the small shared couple dashboard lives here. Detailed answers, SRS
-- history and mistakes remain in each learner's local/Telegram storage.
-- Browser clients authenticate to the Edge Function with a random 256-bit
-- secret. Only its SHA-256 hash is stored in Postgres.
create table public.eft_users (
  account_id uuid primary key,
  secret_hash text not null check (secret_hash ~ '^[0-9a-f]{64}$'),
  telegram_id bigint unique,
  display_name text not null default 'Learner' check (char_length(display_name) between 1 and 64),
  username text check (username is null or char_length(username) <= 64),
  level text not null default 'A2' check (level in ('A2','B1','B2','C1')),
  percent smallint not null default 0 check (percent between 0 and 100),
  balance integer not null default 0 check (balance between 0 and 10000),
  today_minutes integer not null default 0 check (today_minutes between 0 and 1440),
  routines jsonb not null default '{"morning":false,"evening":false}'::jsonb
    check (jsonb_typeof(routines) = 'object'),
  goals jsonb not null default '[]'::jsonb
    check (jsonb_typeof(goals) = 'array' and octet_length(goals::text) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.eft_pairs (
  user_id uuid primary key references public.eft_users(account_id) on delete cascade,
  partner_id uuid not null references public.eft_users(account_id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_id <> partner_id)
);

create unique index eft_pairs_partner_id_idx on public.eft_pairs(partner_id);

create table public.eft_pair_codes (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  owner_id uuid not null unique references public.eft_users(account_id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index eft_pair_codes_expires_at_idx on public.eft_pair_codes(expires_at);

create table public.eft_pair_join_attempts (
  id bigint generated always as identity primary key,
  account_id uuid not null references public.eft_users(account_id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index eft_pair_join_attempts_account_time_idx
  on public.eft_pair_join_attempts(account_id, attempted_at desc);

create table public.eft_gift_requests (
  id text primary key check (id ~ '^[A-Za-z0-9:_-]{4,100}$'),
  requester_id uuid not null references public.eft_users(account_id) on delete cascade,
  recipient_id uuid not null references public.eft_users(account_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  cost integer not null check (cost between 1 and 10000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (requester_id <> recipient_id)
);

create index eft_gift_requests_recipient_updated_idx
  on public.eft_gift_requests(recipient_id, updated_at desc);
create index eft_gift_requests_requester_updated_idx
  on public.eft_gift_requests(requester_id, updated_at desc);

alter table public.eft_users enable row level security;
alter table public.eft_pairs enable row level security;
alter table public.eft_pair_codes enable row level security;
alter table public.eft_pair_join_attempts enable row level security;
alter table public.eft_gift_requests enable row level security;

-- The public browser never receives a database key and cannot query tables.
-- The Edge Function uses only the server-side service role after authenticating
-- the high-entropy account secret.
revoke all on table public.eft_users from public, anon, authenticated;
revoke all on table public.eft_pairs from public, anon, authenticated;
revoke all on table public.eft_pair_codes from public, anon, authenticated;
revoke all on table public.eft_pair_join_attempts from public, anon, authenticated;
revoke all on table public.eft_gift_requests from public, anon, authenticated;

grant select, insert, update, delete on table public.eft_users to service_role;
grant select, insert, update, delete on table public.eft_pairs to service_role;
grant select, insert, update, delete on table public.eft_pair_codes to service_role;
grant select, insert, update, delete on table public.eft_pair_join_attempts to service_role;
grant select, insert, update, delete on table public.eft_gift_requests to service_role;
grant usage, select on sequence public.eft_pair_join_attempts_id_seq to service_role;

create or replace function public.eft_pair_users(p_owner_id uuid, p_joiner_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_owner_id = p_joiner_id then
    raise exception 'A user cannot pair with the same account';
  end if;
  if not exists (select 1 from public.eft_users where account_id = p_owner_id)
     or not exists (select 1 from public.eft_users where account_id = p_joiner_id) then
    raise exception 'Both users must exist before pairing';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(least(p_owner_id::text, p_joiner_id::text), 0));
  perform pg_advisory_xact_lock(hashtextextended(greatest(p_owner_id::text, p_joiner_id::text), 0));

  delete from public.eft_pairs
  where user_id in (p_owner_id, p_joiner_id)
     or partner_id in (p_owner_id, p_joiner_id);

  insert into public.eft_pairs(user_id, partner_id)
  values (p_owner_id, p_joiner_id), (p_joiner_id, p_owner_id);

  delete from public.eft_pair_codes
  where owner_id in (p_owner_id, p_joiner_id);
end;
$$;

revoke all on function public.eft_pair_users(uuid,uuid) from public, anon, authenticated;
grant execute on function public.eft_pair_users(uuid,uuid) to service_role;
