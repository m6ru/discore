-- From 2026-10-30 Supabase no longer auto-grants Data API access on new tables in
-- "public", including on a fresh `supabase db reset` (local, CI). authenticated and
-- anon are granted explicitly elsewhere; this does the same for service_role, which
-- seeds and E2E setup use. A no-op on production, which already has these grants.

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to service_role;
