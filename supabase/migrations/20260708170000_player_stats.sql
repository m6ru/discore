-- Player stats backbone (Phase 5, v1).
--
-- Single source of truth for derived scoring. `score_bucket()` classifies one
-- hole; `player_round_stats` rolls a round up per the current user; and
-- `player_lifetime_stats` aggregates completed rounds for the v1 stats block.
-- The same per-round view also powers the History list and Home recent rounds,
-- replacing the JS fan-out that lived in lib/rounds/round-score-summary.ts.
--
-- Views use `security_invoker` so the querying user's RLS (rounds / hole_scores
-- membership) applies, and each view filters to `auth.uid()` so a caller only
-- ever sees their own rows.

-- Per-hole classification. Ordered so an ace (1 throw) never doubles as an
-- eagle. Pure/deterministic -> immutable, so the planner can inline it.
create or replace function public.score_bucket(strokes integer, par integer)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when strokes = 1 then 'ace'
    when strokes - par <= -2 then 'eagle'
    when strokes - par = -1 then 'birdie'
    when strokes - par = 0 then 'par'
    when strokes - par = 1 then 'bogey'
    else 'double_plus'
  end;
$$;

grant execute on function public.score_bucket(integer, integer) to authenticated;

-- One row per (current user, past round). Completed + abandoned so it can drive
-- the History list; abandoned rows are excluded from stats downstream. LEFT
-- JOIN keeps observer / no-score rounds visible with null vs_par.
create view public.player_round_stats
with (security_invoker = true)
as
select
  rp.user_id,
  r.id as round_id,
  rp.id as participant_id,
  r.layout_id,
  r.status,
  r.started_at,
  r.completed_at,
  c.name as course_name,
  l.name as layout_name,
  (select count(*) from public.holes h2 where h2.layout_id = r.layout_id) as layout_hole_count,
  count(hs.id) as holes_scored,
  case when count(hs.id) = 0 then null else sum(hs.strokes) end as total_strokes,
  case when count(hs.id) = 0 then null else sum(h.par) end as total_par,
  case when count(hs.id) = 0 then null else sum(hs.strokes) - sum(h.par) end as vs_par,
  count(*) filter (where hs.id is not null and public.score_bucket(hs.strokes, h.par) = 'ace') as ace_count,
  count(*) filter (where hs.id is not null and public.score_bucket(hs.strokes, h.par) = 'eagle') as eagle_count,
  count(*) filter (where hs.id is not null and public.score_bucket(hs.strokes, h.par) = 'birdie') as birdie_count,
  count(*) filter (where hs.id is not null and public.score_bucket(hs.strokes, h.par) = 'par') as par_count,
  count(*) filter (where hs.id is not null and public.score_bucket(hs.strokes, h.par) = 'bogey') as bogey_count,
  count(*) filter (where hs.id is not null and public.score_bucket(hs.strokes, h.par) = 'double_plus') as double_plus_count,
  count(*) filter (where hs.ob) as ob_holes
from public.rounds r
join public.round_participants rp on rp.round_id = r.id
join public.layouts l on l.id = r.layout_id
join public.courses c on c.id = l.course_id
left join public.hole_scores hs on hs.round_id = r.id and hs.participant_id = rp.id
left join public.holes h on h.id = hs.hole_id
where rp.user_id = auth.uid()
  and r.status in ('completed', 'abandoned')
group by rp.user_id, r.id, rp.id, r.layout_id, r.status, r.started_at, r.completed_at, c.name, l.name;

grant select on public.player_round_stats to authenticated;

-- Lifetime aggregate for the v1 stats block: completed rounds with at least one
-- scored hole. Plain aggregate (no GROUP BY) -> exactly one row per caller,
-- including a zeroed row when they have no rounds yet.
create view public.player_lifetime_stats
with (security_invoker = true)
as
select
  count(*) as rounds_played,
  min(vs_par) as best_vs_par,
  (array_agg(round_id order by vs_par asc))[1] as best_round_id,
  round(avg(vs_par), 1) as avg_vs_par,
  sum(ace_count) as ace_total,
  sum(eagle_count) as eagle_total,
  sum(birdie_count) as birdie_total,
  sum(par_count) as par_total,
  sum(bogey_count) as bogey_total,
  sum(double_plus_count) as double_plus_total,
  round(avg(ob_holes), 1) as avg_ob_per_round
from public.player_round_stats
where status = 'completed' and holes_scored > 0;

grant select on public.player_lifetime_stats to authenticated;

-- The per-round view joins hole_scores by (round_id, participant_id). The
-- composite unique index leads with round_id; add a participant_id index for
-- participant-centric scans as lifetime history grows.
create index if not exists hole_scores_participant_id_idx
  on public.hole_scores (participant_id);
