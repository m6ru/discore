-- Stats v2 slice A: global stats reshape + ace log.
--
-- Extends `player_lifetime_stats` with best-round context and most-played
-- layout for Home teaser / History block. Adds `player_ace_log` for the
-- dedicated ace journal route. v1 aggregate columns remain for layout stats
-- (slice B) but are no longer surfaced on global History / Home.
--
-- Must drop first: new columns are inserted mid-list and Postgres cannot
-- CREATE OR REPLACE a view when column types/order change.

drop view if exists public.player_lifetime_stats;

create view public.player_lifetime_stats
with (security_invoker = true)
as
select
  (
    select count(*)
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
  ) as rounds_played,
  (
    select min(vs_par)
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
  ) as best_vs_par,
  (
    select round_id
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
    order by vs_par asc, completed_at desc nulls last
    limit 1
  ) as best_round_id,
  (
    select layout_name
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
    order by vs_par asc, completed_at desc nulls last
    limit 1
  ) as best_round_layout_name,
  (
    select course_name
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
    order by vs_par asc, completed_at desc nulls last
    limit 1
  ) as best_round_course_name,
  (
    select completed_at
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
    order by vs_par asc, completed_at desc nulls last
    limit 1
  ) as best_round_completed_at,
  (
    select sum(ace_count)
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
  ) as ace_total,
  (
    select layout_id
    from public.player_round_stats prs
    where prs.status = 'completed' and prs.holes_scored > 0
    group by prs.layout_id
    order by count(*) desc, max(prs.completed_at) desc nulls last
    limit 1
  ) as most_played_layout_id,
  (
    select prs.layout_name
    from public.player_round_stats prs
    where prs.status = 'completed' and prs.holes_scored > 0
    group by prs.layout_id, prs.layout_name
    order by count(*) desc, max(prs.completed_at) desc nulls last
    limit 1
  ) as most_played_layout_name,
  (
    select l.slug
    from public.player_round_stats prs
    join public.layouts l on l.id = prs.layout_id
    where prs.status = 'completed' and prs.holes_scored > 0
    group by prs.layout_id, l.slug
    order by count(*) desc, max(prs.completed_at) desc nulls last
    limit 1
  ) as most_played_layout_slug,
  (
    select c.slug
    from public.player_round_stats prs
    join public.layouts l on l.id = prs.layout_id
    join public.courses c on c.id = l.course_id
    where prs.status = 'completed' and prs.holes_scored > 0
    group by prs.layout_id, c.slug
    order by count(*) desc, max(prs.completed_at) desc nulls last
    limit 1
  ) as most_played_course_slug,
  (
    select prs.course_name
    from public.player_round_stats prs
    where prs.status = 'completed' and prs.holes_scored > 0
    group by prs.layout_id, prs.course_name
    order by count(*) desc, max(prs.completed_at) desc nulls last
    limit 1
  ) as most_played_course_name,
  (
    select count(*)
    from public.player_round_stats prs
    where prs.status = 'completed' and prs.holes_scored > 0
      and prs.layout_id = (
        select layout_id
        from public.player_round_stats
        where status = 'completed' and holes_scored > 0
        group by layout_id
        order by count(*) desc, max(completed_at) desc nulls last
        limit 1
      )
  ) as most_played_round_count,
  (
    select round(avg(vs_par), 1)
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
  ) as avg_vs_par,
  (
    select sum(eagle_count)
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
  ) as eagle_total,
  (
    select sum(birdie_count)
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
  ) as birdie_total,
  (
    select sum(par_count)
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
  ) as par_total,
  (
    select sum(bogey_count)
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
  ) as bogey_total,
  (
    select sum(double_plus_count)
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
  ) as double_plus_total,
  (
    select round(avg(ob_holes), 1)
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
  ) as avg_ob_per_round;

grant select on public.player_lifetime_stats to authenticated;

create view public.player_ace_log
with (security_invoker = true)
as
select
  r.id as round_id,
  r.completed_at,
  h.hole_number,
  l.id as layout_id,
  l.name as layout_name,
  l.slug as layout_slug,
  c.name as course_name,
  c.slug as course_slug
from public.hole_scores hs
inner join public.holes h on h.id = hs.hole_id
inner join public.round_participants rp
  on rp.id = hs.participant_id and rp.round_id = hs.round_id
inner join public.rounds r on r.id = hs.round_id
inner join public.layouts l on l.id = r.layout_id
inner join public.courses c on c.id = l.course_id
where rp.user_id = auth.uid()
  and r.status = 'completed'
  and public.score_bucket(hs.strokes, h.par) = 'ace';

grant select on public.player_ace_log to authenticated;
