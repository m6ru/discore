-- Identify rounds before cleanup. Keep exactly one: Tanel Paats + Kristjan Mõru at Männiku on 2026-06-12.
select
  r.id,
  r.status,
  r.started_at,
  r.completed_at,
  c.name as course_name,
  l.name as layout_name,
  scorer.display_name as scorer_name,
  array_agg(distinct coalesce(p.display_name, rp.guest_name) order by coalesce(p.display_name, rp.guest_name)) as players
from public.rounds r
join public.layouts l on l.id = r.layout_id
join public.courses c on c.id = l.course_id
join public.profiles scorer on scorer.id = r.scorer_id
left join public.round_participants rp on rp.round_id = r.id
left join public.profiles p on p.id = rp.user_id
group by r.id, r.status, r.started_at, r.completed_at, c.name, l.name, scorer.display_name
order by coalesce(r.completed_at, r.started_at) desc nulls last;
