-- Stats v2 slice D: per-hole aggregates on a layout for the current user.
-- Completed rounds only; abandoned excluded. security_invoker + auth.uid()
-- so callers only see their own scored holes.

create view public.player_layout_hole_stats
with (security_invoker = true)
as
select
  r.layout_id,
  h.id as hole_id,
  h.hole_number,
  h.par,
  count(*)::integer as times_played,
  count(*) filter (where public.score_bucket(hs.strokes, h.par) = 'ace')::integer as ace_count,
  count(*) filter (where public.score_bucket(hs.strokes, h.par) = 'eagle')::integer as eagle_count,
  count(*) filter (where public.score_bucket(hs.strokes, h.par) = 'birdie')::integer as birdie_count,
  count(*) filter (where public.score_bucket(hs.strokes, h.par) = 'par')::integer as par_count,
  count(*) filter (where public.score_bucket(hs.strokes, h.par) = 'bogey')::integer as bogey_count,
  count(*) filter (where public.score_bucket(hs.strokes, h.par) = 'double_plus')::integer as double_plus_count,
  count(*) filter (where hs.ob)::integer as ob_count,
  round(avg(hs.strokes - h.par)::numeric, 1) as avg_vs_par
from public.rounds r
join public.round_participants rp on rp.round_id = r.id
join public.hole_scores hs on hs.round_id = r.id and hs.participant_id = rp.id
join public.holes h on h.id = hs.hole_id
where rp.user_id = auth.uid()
  and r.status = 'completed'
group by r.layout_id, h.id, h.hole_number, h.par;

grant select on public.player_layout_hole_stats to authenticated;
