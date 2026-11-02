-- Per-hole history of the signed-in player on one layout (BLUEPRINT §8a, D and C+G).
-- Feeds "Usually 4 · best 3" on the scoring screen and "Where it went" on a
-- finished round. p_exclude_round_id leaves one round out, so a finished round
-- is compared against the player's other rounds, not against itself.
--
-- SECURITY INVOKER + auth.uid(): RLS on rounds/hole_scores still applies, and
-- the function only ever returns the caller's own history.
create or replace function public.player_hole_history(
  p_layout_id uuid,
  p_exclude_round_id uuid default null
)
returns table (
  hole_id uuid,
  times_played integer,
  usual_strokes integer,
  best_strokes integer,
  ob_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    hs.hole_id,
    count(*)::integer as times_played,
    -- Most common score; on a tie the higher one (a caution, not flattery).
    (mode() within group (order by hs.strokes desc))::integer as usual_strokes,
    min(hs.strokes)::integer as best_strokes,
    (count(*) filter (where hs.ob))::integer as ob_count
  from public.rounds r
  join public.round_participants rp on rp.round_id = r.id
  join public.hole_scores hs on hs.round_id = r.id and hs.participant_id = rp.id
  where rp.user_id = auth.uid()
    and r.layout_id = p_layout_id
    and r.status = 'completed'
    and (p_exclude_round_id is null or r.id <> p_exclude_round_id)
  group by hs.hole_id;
$$;

revoke all on function public.player_hole_history(uuid, uuid) from public, anon;
grant execute on function public.player_hole_history(uuid, uuid) to authenticated;
