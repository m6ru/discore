-- Replace visibility-gated read with authenticated read-all (Blueprint: anon still denied).
drop policy if exists "profiles_select" on public.profiles;

create policy "profiles_select" on public.profiles
  for select
  to authenticated
  using (true);

alter table public.profiles drop column if exists visibility;
