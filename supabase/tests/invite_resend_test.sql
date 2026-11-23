-- Re-sending an invite: the scorer sets a declined or cancelled invite back to
-- pending while the round is a draft. Run with: npx supabase test db
begin;
select plan(6);

-- alice = scorer, carol = invited friend (declined), dave = invited friend (cancelled)
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'alice@test.local', 'authenticated', 'authenticated', '{"first_name":"Alice","last_name":"Scorer"}'),
  ('c0000000-0000-0000-0000-00000000000c', 'carol@test.local', 'authenticated', 'authenticated', '{"first_name":"Carol","last_name":"Friend"}'),
  ('d0000000-0000-0000-0000-00000000000d', 'dave@test.local',  'authenticated', 'authenticated', '{"first_name":"Dave","last_name":"Friend"}');

insert into public.courses (id, name, location, slug)
values ('10000000-0000-0000-0000-000000000001', 'Test Park', 'Testville', 'test-park');

insert into public.layouts (id, course_id, name, total_par, total_distance_m, slug)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Main', 3, 100, 'main');

insert into public.holes (id, layout_id, hole_number, par, distance_m)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 3, 100);

-- A draft round and one that has started, each with a declined invite for Carol
-- and a cancelled one for Dave.
insert into public.rounds (id, scorer_id, layout_id, status) values
  ('40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'draft'),
  ('40000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'active');

insert into public.round_invitations (id, round_id, invited_user_id, invited_by, status, responded_at) values
  ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a', 'declined', now()),
  ('60000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-00000000000a', 'cancelled', null),
  ('60000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a', 'declined', now());

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- ---------------------------------------------------------------------------
-- The invitee cannot re-open an invite they declined.
-- ---------------------------------------------------------------------------
select pg_temp.act_as('c0000000-0000-0000-0000-00000000000c');
set local role authenticated;

select throws_ok(
  $$ update public.round_invitations set status = 'pending', responded_at = null
     where id = '60000000-0000-0000-0000-000000000001' $$,
  '42501', null,
  'invitee cannot set their declined invite back to pending'
);

-- ---------------------------------------------------------------------------
-- The scorer re-sends while the round is a draft, not after it has started.
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');
set local role authenticated;

select lives_ok(
  $$ update public.round_invitations set status = 'pending', responded_at = null
     where id = '60000000-0000-0000-0000-000000000001' $$,
  'scorer can re-send a declined invite in a draft round'
);

select lives_ok(
  $$ update public.round_invitations set status = 'pending', responded_at = null
     where id = '60000000-0000-0000-0000-000000000002' $$,
  'scorer can re-send a cancelled invite in a draft round'
);

select throws_ok(
  $$ update public.round_invitations set status = 'pending', responded_at = null
     where id = '60000000-0000-0000-0000-000000000003' $$,
  '42501', null,
  'scorer cannot re-send an invite once the round has started'
);

select lives_ok(
  $$ update public.round_invitations set status = 'cancelled'
     where id = '60000000-0000-0000-0000-000000000003' $$,
  'scorer can still cancel an invite after the round has started'
);

reset role;

select results_eq(
  $$ select status, responded_at is null from public.round_invitations
     where round_id = '40000000-0000-0000-0000-000000000001' order by id $$,
  $$ values ('pending'::text, true), ('pending'::text, true) $$,
  're-sent invites are pending again with the old answer cleared'
);

select * from finish();
rollback;
