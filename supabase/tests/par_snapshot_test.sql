-- Scores keep the par they were played at. Run with: npx supabase test db
begin;
select plan(6);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'alice@test.local', 'authenticated', 'authenticated', '{"first_name":"Alice","last_name":"Scorer"}');

insert into public.courses (id, name, location, slug)
values ('10000000-0000-0000-0000-000000000001', 'Test Park', 'Testville', 'test-park');

insert into public.layouts (id, course_id, name, total_par, total_distance_m, slug)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Main', 6, 200, 'main');

insert into public.holes (id, layout_id, hole_number, par, distance_m) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 3, 100),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 2, 3, 100);

-- The scorer's participant row is added by trigger.
insert into public.rounds (id, scorer_id, layout_id, status, started_at)
values ('40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a',
        '20000000-0000-0000-0000-000000000001', 'active', now());

select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

-- A client trying to pick its own par is ignored.
insert into public.hole_scores (round_id, participant_id, hole_id, strokes, ob, par)
select '40000000-0000-0000-0000-000000000001', rp.id, '30000000-0000-0000-0000-000000000001', 2, false, 9
from public.round_participants rp
where rp.round_id = '40000000-0000-0000-0000-000000000001';

select is(
  (select par from public.hole_scores where hole_id = '30000000-0000-0000-0000-000000000001'),
  3::smallint,
  'a new score stores the hole''s current par, not a client-supplied one'
);

update public.hole_scores set par = 9
where hole_id = '30000000-0000-0000-0000-000000000001';

select is(
  (select par from public.hole_scores where hole_id = '30000000-0000-0000-0000-000000000001'),
  3::smallint,
  'a client cannot change the stored par'
);

-- Course maintenance corrects hole 1 to par 4 (runs as a migration would).
reset role;
update public.holes set par = 4 where id = '30000000-0000-0000-0000-000000000001';
set local role authenticated;

select is(
  (select par from public.hole_scores where hole_id = '30000000-0000-0000-0000-000000000001'),
  3::smallint,
  'correcting a hole''s par does not touch scores already played'
);

update public.hole_scores set strokes = 3
where hole_id = '30000000-0000-0000-0000-000000000001';

select is(
  (select par from public.hole_scores where hole_id = '30000000-0000-0000-0000-000000000001'),
  3::smallint,
  'editing strokes on an old score keeps its original par'
);

update public.rounds set status = 'completed', completed_at = now()
where id = '40000000-0000-0000-0000-000000000001';

select is(
  (select vs_par from public.player_round_stats where round_id = '40000000-0000-0000-0000-000000000001'),
  0::bigint,
  'round stats score against the stored par (3 on a par 3), not the corrected par 4'
);

reset role;
update public.holes set par = 5 where id = '30000000-0000-0000-0000-000000000002';
insert into public.hole_scores (round_id, participant_id, hole_id, strokes, ob)
select '40000000-0000-0000-0000-000000000001', rp.id, '30000000-0000-0000-0000-000000000002', 5, false
from public.round_participants rp
where rp.round_id = '40000000-0000-0000-0000-000000000001';

select is(
  (select par from public.hole_scores where hole_id = '30000000-0000-0000-0000-000000000002'),
  5::smallint,
  'scores recorded after a correction use the new par'
);

select * from finish();
rollback;
