-- Legacy layout from 20260420185200_seed_courses.sql (slug pro-18).
-- Superseded by jarve-discgolfipark-pro-18-2026.json (slug pro-18-2026).
-- Holes and any rounds on this layout cascade-delete with the layout row.

delete from public.layouts l
using public.courses c
where l.course_id = c.id
  and c.slug in ('jarve-discgolfipark', 'jarve')
  and l.slug = 'pro-18';
