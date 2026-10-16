-- Fix: claiming an anonymous trial failed with
--   "new row violates row-level security policy for table rounds".
--
-- The claim inserts the round with RETURNING (supabase-js `.insert().select()`),
-- so Postgres also checks the SELECT policy against the new row. The old policy
-- only called is_round_member(), a SECURITY DEFINER function whose own query
-- runs on the statement's snapshot and cannot see the row being inserted.
-- A direct `scorer_id` comparison is evaluated on the new row itself (and is
-- cheaper than the function call for the common "my own round" case).

drop policy if exists "rounds_select" on public.rounds;
create policy "rounds_select" on public.rounds
  for select
  using (
    scorer_id = (select auth.uid())
    or public.is_round_member(rounds.id, (select auth.uid()))
    or public.has_round_invite(rounds.id, (select auth.uid()))
  );
