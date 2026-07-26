-- Lifetime stats: career volume (throws + meters) and most-played by course.
-- Replaces layout-scoped most-played. Ace total remains for future surfaces.
-- Drop first: column set / meaning changes.

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
    select coalesce(sum(total_strokes), 0)::bigint
    from public.player_round_stats
    where status = 'completed' and holes_scored > 0
  ) as total_throws,
  (
    select coalesce(sum(h.distance_m), 0)::bigint
    from public.hole_scores hs
    join public.holes h on h.id = hs.hole_id
    join public.round_participants rp
      on rp.id = hs.participant_id and rp.round_id = hs.round_id
    join public.rounds r on r.id = hs.round_id
    where rp.user_id = auth.uid()
      and r.status = 'completed'
  ) as total_distance_m,
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
    select c.id
    from public.player_round_stats prs
    join public.layouts l on l.id = prs.layout_id
    join public.courses c on c.id = l.course_id
    where prs.status = 'completed' and prs.holes_scored > 0
    group by c.id
    order by count(*) desc, max(prs.completed_at) desc nulls last
    limit 1
  ) as most_played_course_id,
  (
    select c.slug
    from public.player_round_stats prs
    join public.layouts l on l.id = prs.layout_id
    join public.courses c on c.id = l.course_id
    where prs.status = 'completed' and prs.holes_scored > 0
    group by c.id, c.slug
    order by count(*) desc, max(prs.completed_at) desc nulls last
    limit 1
  ) as most_played_course_slug,
  (
    select c.name
    from public.player_round_stats prs
    join public.layouts l on l.id = prs.layout_id
    join public.courses c on c.id = l.course_id
    where prs.status = 'completed' and prs.holes_scored > 0
    group by c.id, c.name
    order by count(*) desc, max(prs.completed_at) desc nulls last
    limit 1
  ) as most_played_course_name,
  (
    select count(*)
    from public.player_round_stats prs
    join public.layouts l on l.id = prs.layout_id
    where prs.status = 'completed'
      and prs.holes_scored > 0
      and l.course_id = (
        select c2.id
        from public.player_round_stats prs2
        join public.layouts l2 on l2.id = prs2.layout_id
        join public.courses c2 on c2.id = l2.course_id
        where prs2.status = 'completed' and prs2.holes_scored > 0
        group by c2.id
        order by count(*) desc, max(prs2.completed_at) desc nulls last
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
