-- Stats v2 slice B: layout- and course-scoped player stats views.

create view public.player_course_stats
with (security_invoker = true)
as
select
  c.id as course_id,
  c.slug as course_slug,
  c.name as course_name,
  count(*) as rounds_played,
  max(prs.completed_at) as last_played_at
from public.player_round_stats prs
join public.layouts l on l.id = prs.layout_id
join public.courses c on c.id = l.course_id
where prs.status = 'completed'
  and prs.holes_scored > 0
group by c.id, c.slug, c.name;

grant select on public.player_course_stats to authenticated;

create view public.player_layout_stats
with (security_invoker = true)
as
select
  l.id as layout_id,
  l.slug as layout_slug,
  l.name as layout_name,
  c.id as course_id,
  c.slug as course_slug,
  c.name as course_name,
  count(*) as rounds_played,
  min(prs.vs_par) as best_vs_par,
  (array_agg(prs.round_id order by prs.vs_par asc, prs.completed_at desc nulls last))[1] as best_round_id,
  round(avg(prs.vs_par), 1) as avg_vs_par,
  sum(prs.ace_count) as ace_total,
  sum(prs.eagle_count) as eagle_total,
  sum(prs.birdie_count) as birdie_total,
  sum(prs.par_count) as par_total,
  sum(prs.bogey_count) as bogey_total,
  sum(prs.double_plus_count) as double_plus_total,
  sum(prs.holes_scored) as holes_played,
  sum(prs.ob_holes) as ob_holes_total
from public.player_round_stats prs
join public.layouts l on l.id = prs.layout_id
join public.courses c on c.id = l.course_id
where prs.status = 'completed'
  and prs.holes_scored > 0
group by l.id, l.slug, l.name, c.id, c.slug, c.name;

grant select on public.player_layout_stats to authenticated;
