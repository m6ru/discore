-- Ensure the four tables the app subscribes to are in the `supabase_realtime`
-- publication. Previously documented in STATUS.md as a manual SQL step — that
-- meant a fresh project could silently regress the Observer flow if the step
-- was missed. Each branch is idempotent.

do $$
declare
  t text;
begin
  foreach t in array array['hole_scores', 'round_invitations', 'round_participants', 'rounds']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
