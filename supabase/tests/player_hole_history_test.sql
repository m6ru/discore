-- player_hole_history: the caller's own per-hole usual/best. Run with: npx supabase test db
begin;
select plan(7);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'alice@test.local', 'authenticated', 'authenticated', '{"first_name":"Alice","last_name":"Player"}'),
  ('b0000000-0000-0000-0000-00000000000b', 'bob@test.local', 'authenticated', 'authenticated', '{"first_name":"Bob","last_name":"Player"}');

insert into public.courses (id, name, location, slug)
values ('10000000-0000-0000-0000-000000000001', 'Test Park', 'Testville', 'test-park');

insert into public.layouts (id, course_id, name, total_par, total_distance_m, slug)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Main', 3, 100, 'main');

insert into public.holes (id, layout_id, hole_number, par, distance_m)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 3, 100);

-- Alice: three rounds (4, 4, 6 with OB) and one still active (2).
-- Bob: one round with a 2 that must never show up for Alice.
insert into public.rounds (id, scorer_id, layout_id, status, started_at, completed_at) values
  ('40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'completed', now(), now()),
  ('40000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'completed', now(), now()),
  ('40000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'completed', now(), now()),
  ('40000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'active', now(), null),
  ('40000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001', 'completed', now(), now());

insert into public.hole_scores (round_id, participant_id, hole_id, strokes, ob)
select rp.round_id, rp.id, '30000000-0000-0000-0000-000000000001', s.strokes, s.ob
from public.round_participants rp
join (values
  ('40000000-0000-0000-0000-000000000001'::uuid, 4, false),
  ('40000000-0000-0000-0000-000000000002'::uuid, 4, false),
  ('40000000-0000-0000-0000-000000000003'::uuid, 6, true),
  ('40000000-0000-0000-0000-000000000004'::uuid, 2, false),
  ('40000000-0000-0000-0000-000000000005'::uuid, 2, false)
) as s(round_id, strokes, ob) on s.round_id = rp.round_id;

select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

select is(
  (select times_played from public.player_hole_history('20000000-0000-0000-0000-000000000001')),
  3,
  'counts only the caller''s completed rounds (not the active one, not another player''s)'
);

select is(
  (select usual_strokes from public.player_hole_history('20000000-0000-0000-0000-000000000001')),
  4,
  'usual is the most common score'
);

select is(
  (select best_strokes from public.player_hole_history('20000000-0000-0000-0000-000000000001')),
  4,
  'best is the caller''s own lowest, not another player''s'
);

select is(
  (select ob_count from public.player_hole_history('20000000-0000-0000-0000-000000000001')),
  1,
  'counts holes played with an OB'
);

select is(
  (select times_played from public.player_hole_history(
    '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003')),
  2,
  'an excluded round is left out'
);

select set_config('request.jwt.claims',
  '{"sub":"b0000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

select is(
  (select best_strokes from public.player_hole_history('20000000-0000-0000-0000-000000000001')),
  2,
  'another caller sees only their own history'
);

reset role;
set local role anon;

select throws_ok(
  $$select * from public.player_hole_history('20000000-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'signed-out visitors cannot call it'
);

select * from finish();
rollback;
