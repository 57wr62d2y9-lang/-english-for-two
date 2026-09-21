-- Service-role access is server-only. These explicit deny policies document
-- that browser roles must never read or write the shared couple tables.
create policy "deny direct browser access" on public.eft_users
  for all to anon, authenticated using (false) with check (false);
create policy "deny direct browser access" on public.eft_pairs
  for all to anon, authenticated using (false) with check (false);
create policy "deny direct browser access" on public.eft_pair_codes
  for all to anon, authenticated using (false) with check (false);
create policy "deny direct browser access" on public.eft_pair_join_attempts
  for all to anon, authenticated using (false) with check (false);
create policy "deny direct browser access" on public.eft_gift_requests
  for all to anon, authenticated using (false) with check (false);
