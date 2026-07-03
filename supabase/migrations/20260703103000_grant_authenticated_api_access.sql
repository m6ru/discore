-- Discore disables Supabase "Automatically expose new tables" for manual control.
-- RLS policies alone are not enough: the authenticated role still needs table-level
-- GRANTs before PostgREST can reach rows (otherwise: permission denied for table …).

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;

grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant usage, select on sequences to authenticated;
