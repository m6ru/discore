-- RLS and data-integrity tests. Run with: npx supabase test db
-- Each test acts as a real role (anon / authenticated user) through the same
-- auth.uid() machinery PostgREST uses, inside a transaction that is rolled back.
begin;
select plan(27);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres): three users, one course with two layouts.
--   alice = scorer, bob = registered stranger, carol = invited friend
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'alice@test.local', 'authenticated', 'authenticated', '{"first_name":"Alice","last_name":"Scorer"}'),
  ('b0000000-0000-0000-0000-00000000000b', 'bob@test.local',   'authenticated', 'authenticated', '{"first_name":"Bob","last_name":"Stranger"}'),
  ('c0000000-0000-0000-0000-00000000000c', 'carol@test.local', 'authenticated', 'authenticated', '{"first_name":"Carol","last_name":"Friend"}');

insert into public.courses (id, name, location, slug)
values ('10000000-0000-0000-0000-000000000001', 'Test Park', 'Testville', 'test-park');

insert into public.layouts (id, course_id, name, total_par, total_distance_m, slug) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Main', 6, 200, 'main'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Short', 3, 60, 'short');

insert into public.holes (id, layout_id, hole_number, par, distance_m) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 3, 100),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 2, 3, 100),
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000002', 1, 3, 60);

-- Alice's draft round (scorer participant is added by trigger) and Bob's own round.
insert into public.rounds (id, scorer_id, layout_id, status) values
  ('40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'draft'),
  ('40000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001', 'draft');

insert into public.round_invitations (round_id, invited_user_id, invited_by)
values ('40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a');

-- A participant in Bob's round with a known id (an attacker could guess or leak one).
insert into public.round_participants (id, round_id, guest_name)
values ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'Bob''s Guest');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- ---------------------------------------------------------------------------
-- Participants (draft setup)
-- ---------------------------------------------------------------------------
select pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');
set local role authenticated;

select throws_ok(
  $$ insert into public.round_participants (round_id, user_id)
     values ('40000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-00000000000b') $$,
  '42501', null,
  'scorer cannot add a registered user who has not accepted an invite'
);

select lives_ok(
  $$ insert into public.round_participants (round_id, guest_name)
     values ('40000000-0000-0000-0000-000000000001', 'Guest Gary') $$,
  'scorer can add a named guest to a draft round'
);

select throws_ok(
  $$ insert into public.round_participants (round_id, guest_name)
     values ('40000000-0000-0000-0000-000000000002', 'Sneaky') $$,
  '42501', null,
  'user cannot add participants to someone else''s round'
);

reset role;
select pg_temp.act_as('c0000000-0000-0000-0000-00000000000c');
set local role authenticated;

select lives_ok(
  $$ insert into public.round_participants (round_id, user_id)
     values ('40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000c') $$,
  'invited user can join the round themselves'
);

reset role;
select pg_temp.act_as('b0000000-0000-0000-0000-00000000000b');
set local role authenticated;

select throws_ok(
  $$ insert into public.round_participants (round_id, user_id)
     values ('40000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-00000000000b') $$,
  '42501', null,
  'uninvited user cannot join a round'
);

select is_empty(
  $$ select 1 from public.rounds where id = '40000000-0000-0000-0000-000000000001' $$,
  'stranger cannot read someone else''s round'
);

-- ---------------------------------------------------------------------------
-- Round lifecycle (as alice)
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');
set local role authenticated;

select throws_ok(
  $$ insert into public.rounds (scorer_id, layout_id, status)
     values ('a0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000002', 'completed') $$,
  '42501', null,
  'cannot insert an already-completed round outside the trial claim'
);

select throws_ok(
  $$ insert into public.rounds (scorer_id, layout_id, status, guest_claim_id)
     values ('a0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000002', 'draft', gen_random_uuid()) $$,
  '42501', null,
  'cannot insert a draft round carrying a trial claim id'
);

select lives_ok(
  $$ update public.rounds set status = 'active', started_at = now()
     where id = '40000000-0000-0000-0000-000000000001' $$,
  'scorer can start a draft round'
);

select throws_ok(
  $$ update public.rounds set layout_id = '20000000-0000-0000-0000-000000000002'
     where id = '40000000-0000-0000-0000-000000000001' $$,
  'P0001', null,
  'cannot change the layout of a started round'
);

select throws_ok(
  $$ update public.rounds set guest_claim_id = gen_random_uuid()
     where id = '40000000-0000-0000-0000-000000000001' $$,
  'P0001', null,
  'cannot set a trial claim id on an existing round'
);

-- ---------------------------------------------------------------------------
-- Scores (round is active)
-- ---------------------------------------------------------------------------
select lives_ok(
  $$ insert into public.hole_scores (round_id, participant_id, hole_id, strokes, ob)
     select '40000000-0000-0000-0000-000000000001', rp.id, '30000000-0000-0000-0000-000000000001', 3, false
     from public.round_participants rp
     where rp.round_id = '40000000-0000-0000-0000-000000000001'
       and rp.user_id = 'a0000000-0000-0000-0000-00000000000a' $$,
  'scorer can save a valid score'
);

select throws_ok(
  $$ insert into public.hole_scores (round_id, participant_id, hole_id, strokes, ob)
     select '40000000-0000-0000-0000-000000000001', rp.id, '30000000-0000-0000-0000-000000000009', 3, false
     from public.round_participants rp
     where rp.round_id = '40000000-0000-0000-0000-000000000001'
       and rp.user_id = 'a0000000-0000-0000-0000-00000000000a' $$,
  'P0001', null,
  'cannot score a hole from a different layout'
);

select throws_ok(
  $$ insert into public.hole_scores (round_id, participant_id, hole_id, strokes, ob)
     values ('40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
             '30000000-0000-0000-0000-000000000002', 3, false) $$,
  'P0001', null,
  'cannot attach a participant from another round'
);

select throws_ok(
  $$ insert into public.hole_scores (round_id, participant_id, hole_id, strokes, ob)
     select '40000000-0000-0000-0000-000000000001', rp.id, '30000000-0000-0000-0000-000000000002', 0, false
     from public.round_participants rp
     where rp.round_id = '40000000-0000-0000-0000-000000000001'
       and rp.user_id = 'a0000000-0000-0000-0000-00000000000a' $$,
  '23514', null,
  'strokes must be between 1 and 25'
);

reset role;
select pg_temp.act_as('c0000000-0000-0000-0000-00000000000c');
set local role authenticated;

select throws_ok(
  $$ insert into public.hole_scores (round_id, participant_id, hole_id, strokes, ob)
     select '40000000-0000-0000-0000-000000000001', rp.id, '30000000-0000-0000-0000-000000000002', 4, false
     from public.round_participants rp
     where rp.round_id = '40000000-0000-0000-0000-000000000001'
       and rp.user_id = 'c0000000-0000-0000-0000-00000000000c' $$,
  '42501', null,
  'observer cannot write scores'
);

select isnt_empty(
  $$ select 1 from public.hole_scores where round_id = '40000000-0000-0000-0000-000000000001' $$,
  'observer can read the round''s scores'
);

-- ---------------------------------------------------------------------------
-- Completion (as alice)
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');
set local role authenticated;

select lives_ok(
  $$ update public.rounds set status = 'completed', completed_at = now()
     where id = '40000000-0000-0000-0000-000000000001' $$,
  'scorer can complete an active round'
);

select throws_ok(
  $$ update public.rounds set status = 'active'
     where id = '40000000-0000-0000-0000-000000000001' $$,
  'P0001', null,
  'cannot reopen a completed round'
);

select lives_ok(
  $$ update public.rounds set name = 'Sunday round'
     where id = '40000000-0000-0000-0000-000000000001' $$,
  'scorer can still rename a completed round'
);

-- ---------------------------------------------------------------------------
-- Trial claim path still works
-- ---------------------------------------------------------------------------
select lives_ok(
  $$ insert into public.rounds (id, scorer_id, layout_id, status, completed_at, guest_claim_id)
     values ('40000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a',
             '20000000-0000-0000-0000-000000000002', 'completed', now(), gen_random_uuid()) $$,
  'trial claim can insert a completed round'
);

select lives_ok(
  $$ insert into public.round_participants (round_id, guest_name)
     values ('40000000-0000-0000-0000-000000000003', 'Trial Guest') $$,
  'trial claim can add a named guest'
);

select lives_ok(
  $$ insert into public.hole_scores (round_id, participant_id, hole_id, strokes, ob)
     select '40000000-0000-0000-0000-000000000003', rp.id, '30000000-0000-0000-0000-000000000009', 2, false
     from public.round_participants rp
     where rp.round_id = '40000000-0000-0000-0000-000000000003' $$,
  'trial claim can insert scores'
);

-- ---------------------------------------------------------------------------
-- Anonymous visitors and catalog maintenance
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select isnt_empty($$ select 1 from public.courses $$, 'anon can browse the course catalog');

select is_empty($$ select 1 from public.rounds $$, 'anon sees no rounds');

reset role;

select throws_ok(
  $$ delete from public.layouts where id = '20000000-0000-0000-0000-000000000001' $$,
  '23503', null,
  'deleting a layout that has rounds is refused (no silent history loss)'
);

select is_empty(
  $$ select tablename from pg_tables where schemaname = 'public' and not rowsecurity $$,
  'every public table has RLS enabled'
);

select * from finish();
rollback;
