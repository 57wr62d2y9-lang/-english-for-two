-- Personal learning data are never part of the partner dashboard.
create table public.eft_private_records (
  account_id uuid not null references public.eft_users(account_id) on delete cascade,
  record_key text not null check (char_length(record_key) between 1 and 180),
  payload jsonb,
  updated_ms bigint not null check (updated_ms > 0),
  primary key(account_id, record_key),
  check (payload is null or octet_length(payload::text) <= 180000)
);
alter table public.eft_private_records enable row level security;
revoke all on public.eft_private_records from public, anon, authenticated;
grant select, insert, update, delete on public.eft_private_records to service_role;
create policy "deny direct browser access" on public.eft_private_records
  for all to anon, authenticated using (false) with check (false);

-- An older device or a delayed retry cannot replace newer per-item state.
create function public.eft_merge_private_records(p_account_id uuid, p_records jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if jsonb_typeof(p_records) <> 'array' or jsonb_array_length(p_records)>120 then
    raise exception 'Invalid record batch';
  end if;
  insert into public.eft_private_records(account_id,record_key,payload,updated_ms)
  select p_account_id, entry->>'key', entry->'data', (entry->>'at')::bigint
  from jsonb_array_elements(p_records) as entry
  on conflict(account_id,record_key) do update
  set payload=excluded.payload,updated_ms=excluded.updated_ms
  where excluded.updated_ms>eft_private_records.updated_ms
     or (excluded.updated_ms=eft_private_records.updated_ms
       and excluded.record_key like 'progress:%'
       and coalesce((excluded.payload->>'c')::integer,0)+coalesce((excluded.payload->>'w')::integer,0)
          >coalesce((eft_private_records.payload->>'c')::integer,0)+coalesce((eft_private_records.payload->>'w')::integer,0));
end;
$$;
revoke all on function public.eft_merge_private_records(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.eft_merge_private_records(uuid,jsonb) to service_role;

create table public.eft_notifications (
  id text primary key check(char_length(id) between 6 and 150),
  recipient_id uuid not null references public.eft_users(account_id) on delete cascade,
  sender_id uuid not null references public.eft_users(account_id) on delete cascade,
  payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<10000),
  created_at timestamptz not null default now(),
  check(recipient_id<>sender_id)
);
create index eft_notifications_recipient_time on public.eft_notifications(recipient_id,created_at desc);
create index eft_notifications_sender on public.eft_notifications(sender_id);
alter table public.eft_notifications enable row level security;
revoke all on public.eft_notifications from public, anon, authenticated;
grant select, insert, update, delete on public.eft_notifications to service_role;
create policy "deny direct browser access" on public.eft_notifications
  for all to anon, authenticated using (false) with check (false);
