-- Course suggestions: who can send, read and review. Run with: npx supabase test db
begin;
select plan(23);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'alice@test.local', 'authenticated', 'authenticated', '{"first_name":"Alice","last_name":"Sender"}'),
  ('b0000000-0000-0000-0000-00000000000b', 'bob@test.local',   'authenticated', 'authenticated', '{"first_name":"Bob","last_name":"Other"}'),
  ('d0000000-0000-0000-0000-00000000000d', 'dana@test.local',  'authenticated', 'authenticated', '{"first_name":"Dana","last_name":"Admin"}');

insert into public.app_admins (user_id) values ('d0000000-0000-0000-0000-00000000000d');

insert into public.courses (id, name, location, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Test Park', 'Testville', 'test-park'),
  ('10000000-0000-0000-0000-000000000002', 'Other Park', 'Testville', 'other-park');
insert into public.layouts (id, course_id, name, total_par, total_distance_m, slug) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Main', 6, 200, 'main'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Main', 6, 200, 'main');
insert into public.holes (id, layout_id, hole_number, par, distance_m) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 3, 80),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 1, 3, 80);

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- ---------------------------------------------------------------------------
-- Sending
-- ---------------------------------------------------------------------------
select pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');
set local role authenticated;

select lives_ok(
  $$ insert into public.course_suggestions (id, kind, course_id, layout_id, note, photo_paths)
     values ('50000000-0000-0000-0000-000000000001', 'hole_info',
             '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
             '  Hole 7 is par 4 now  ', array['a0000000-0000-0000-0000-00000000000a/tee.jpg']) $$,
  'a signed-in user can send a suggestion with their own photo'
);

select is(
  (select note from public.course_suggestions where id = '50000000-0000-0000-0000-000000000001'),
  'Hole 7 is par 4 now',
  'the note is trimmed'
);

select lives_ok(
  $$ insert into public.course_suggestions (id, kind, course_name, location, note)
     values ('50000000-0000-0000-0000-000000000002', 'new_course', 'New Forest Park', 'Somewhere', '9 baskets') $$,
  'a new course needs no course id'
);

-- From the scoring screen: layout + hole only, the course is filled in.
select lives_ok(
  $$ insert into public.course_suggestions (id, kind, layout_id, hole_id, note)
     values ('50000000-0000-0000-0000-000000000003', 'hole_info',
             '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Par 3 → 4') $$,
  'a hole suggestion needs only the layout and the hole'
);

select is(
  (select course_id from public.course_suggestions where id = '50000000-0000-0000-0000-000000000003'),
  '10000000-0000-0000-0000-000000000001'::uuid,
  'the course is derived from the layout'
);

select throws_ok(
  $$ insert into public.course_suggestions (kind, layout_id, hole_id, note)
     values ('hole_info', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'x') $$,
  'P0001', 'Hole does not belong to this layout',
  'the hole must belong to the layout'
);

select throws_ok(
  $$ update public.course_suggestions set hole_id = null where id = '50000000-0000-0000-0000-000000000003' $$,
  'P0001', 'A suggestion''s content cannot be changed',
  'the hole cannot be changed after sending'
);

select throws_ok(
  $$ insert into public.course_suggestions (kind, note) values ('hole_info', 'x') $$,
  'P0001', 'A suggestion needs a course',
  'a fix needs a course'
);

select throws_ok(
  $$ insert into public.course_suggestions (kind, note) values ('new_course', 'x') $$,
  'P0001', 'A new course needs a name',
  'a new course needs a name'
);

select throws_ok(
  $$ insert into public.course_suggestions (kind, course_id, layout_id, note)
     values ('hole_info', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'x') $$,
  'P0001', 'Layout does not belong to this course',
  'the layout must belong to the course'
);

select throws_ok(
  $$ insert into public.course_suggestions (kind, course_id, note, photo_paths)
     values ('other', '10000000-0000-0000-0000-000000000001', 'x', array['b0000000-0000-0000-0000-00000000000b/x.jpg']) $$,
  'P0001', 'Photo does not belong to the sender',
  'photos must be from the sender''s own folder'
);

select throws_ok(
  $$ insert into public.course_suggestions (kind, course_id, note, user_id)
     values ('other', '10000000-0000-0000-0000-000000000001', 'x', 'b0000000-0000-0000-0000-00000000000b') $$,
  '42501', null,
  'nobody can send a suggestion in someone else''s name'
);

select throws_ok(
  $$ insert into public.course_suggestions (kind, course_id, note, status)
     values ('other', '10000000-0000-0000-0000-000000000001', 'x', 'applied') $$,
  '42501', null,
  'a sender cannot pre-approve their suggestion'
);

select throws_ok(
  $$ update public.course_suggestions set status = 'applied' where id = '50000000-0000-0000-0000-000000000001' $$,
  'P0001', 'Only an admin can review suggestions',
  'a sender cannot review their own suggestion'
);

select throws_ok(
  $$ update public.course_suggestions set note = 'changed' where id = '50000000-0000-0000-0000-000000000001' $$,
  'P0001', 'A suggestion''s content cannot be changed',
  'a sent suggestion cannot be edited'
);

select is(
  (select count(*)::int from public.app_admins),
  0,
  'the admin list is invisible to users'
);

select ok(not public.is_app_admin(), 'a normal user is not an admin');

-- ---------------------------------------------------------------------------
-- Other users
-- ---------------------------------------------------------------------------
select pg_temp.act_as('b0000000-0000-0000-0000-00000000000b');

select is(
  (select count(*)::int from public.course_suggestions),
  0,
  'other users cannot see someone''s suggestions'
);

-- ---------------------------------------------------------------------------
-- Admin review
-- ---------------------------------------------------------------------------
select pg_temp.act_as('d0000000-0000-0000-0000-00000000000d');

select is(
  (select count(*)::int from public.course_suggestions),
  3,
  'the admin sees every suggestion'
);

update public.course_suggestions
  set status = 'applied', owner_note = 'Updated, thanks!'
  where id = '50000000-0000-0000-0000-000000000001';

select isnt(
  (select reviewed_at from public.course_suggestions where id = '50000000-0000-0000-0000-000000000001'),
  null,
  'reviewing stamps reviewed_at'
);

select throws_ok(
  $$ update public.course_suggestions set thanked_seen_at = now() where id = '50000000-0000-0000-0000-000000000001' $$,
  'P0001', 'Only the sender can dismiss the thank-you',
  'the admin cannot dismiss the sender''s thank-you'
);

-- ---------------------------------------------------------------------------
-- Sender sees the result and dismisses the thank-you
-- ---------------------------------------------------------------------------
select pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');

select lives_ok(
  $$ update public.course_suggestions set thanked_seen_at = now() where id = '50000000-0000-0000-0000-000000000001' $$,
  'the sender can dismiss the thank-you'
);

-- ---------------------------------------------------------------------------
-- Spam guard
-- ---------------------------------------------------------------------------
insert into public.course_suggestions (kind, course_id, note)
  select 'other', '10000000-0000-0000-0000-000000000001', 'n' || i from generate_series(1, 7) i;

select throws_ok(
  $$ insert into public.course_suggestions (kind, course_id, note) values ('other', '10000000-0000-0000-0000-000000000001', 'eleventh') $$,
  'P0001', 'Too many suggestions today — try again tomorrow',
  'at most 10 suggestions per user per day'
);

select * from finish();
rollback;
