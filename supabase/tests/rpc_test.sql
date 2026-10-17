-- claim_trial / accept_invite: all-or-nothing writes. Run with: npx supabase test db
begin;
select plan(14);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'alice@test.local', 'authenticated', 'authenticated', '{"first_name":"Alice","last_name":"Scorer"}'),
  ('b0000000-0000-0000-0000-00000000000b', 'bob@test.local',   'authenticated', 'authenticated', '{"first_name":"Bob","last_name":"Stranger"}'),
  ('c0000000-0000-0000-0000-00000000000c', 'carol@test.local', 'authenticated', 'authenticated', '{"first_name":"Carol","last_name":"Friend"}');

insert into public.courses (id, name, location, slug)
values ('10000000-0000-0000-0000-000000000001', 'Test Park', 'Testville', 'test-park');

insert into public.layouts (id, course_id, name, total_par, total_distance_m, slug)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Main', 6, 200, 'main');

insert into public.holes (id, layout_id, hole_number, par, distance_m) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 3, 100),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 2, 3, 100);

-- Alice's draft round with a pending invite for Carol and a declined one for Bob.
insert into public.rounds (id, scorer_id, layout_id, status) values
  ('40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'draft');
insert into public.round_invitations (id, round_id, invited_user_id, invited_by, status) values
  ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a', 'pending'),
  ('60000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000a', 'declined');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- A finished two-player trial: Alice + guest "Gary", both holes scored.
create function pg_temp.claim(claim uuid, scores jsonb) returns uuid language sql as $$
  select public.claim_trial(
    claim,
    '20000000-0000-0000-0000-000000000001',
    now() - interval '1 hour',
    now(),
    array['30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002']::uuid[],
    '[{"id":"p1","name":"Alice","is_scorer":true},{"id":"p2","name":" Gary ","is_scorer":false}]',
    scores
  );
$$;

create function pg_temp.good_scores() returns jsonb language sql as $$
  select '[
    {"player_id":"p1","hole_id":"30000000-0000-0000-0000-000000000001","strokes":3,"ob":false},
    {"player_id":"p1","hole_id":"30000000-0000-0000-0000-000000000002","strokes":4,"ob":true},
    {"player_id":"p2","hole_id":"30000000-0000-0000-0000-000000000001","strokes":2,"ob":false},
    {"player_id":"p2","hole_id":"30000000-0000-0000-0000-000000000002","strokes":5,"ob":false}
  ]'::jsonb;
$$;

-- ---------------------------------------------------------------------------
-- claim_trial
-- ---------------------------------------------------------------------------
select pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');
set local role authenticated;

select isnt(
  pg_temp.claim('70000000-0000-0000-0000-000000000001', pg_temp.good_scores()),
  null,
  'claim_trial saves the trial and returns the new round id'
);

select results_eq(
  $$ select status::text, (select count(*) from public.round_participants rp where rp.round_id = r.id),
            (select count(*) from public.hole_scores hs where hs.round_id = r.id)
     from public.rounds r where r.guest_claim_id = '70000000-0000-0000-0000-000000000001' $$,
  $$ values ('completed', 2::bigint, 4::bigint) $$,
  'the claimed round is completed with the scorer, the guest and all four scores'
);

select is(
  (select guest_name from public.round_participants rp
   join public.rounds r on r.id = rp.round_id
   where r.guest_claim_id = '70000000-0000-0000-0000-000000000001' and rp.user_id is null),
  'Gary',
  'guest names are trimmed'
);

select is(
  pg_temp.claim('70000000-0000-0000-0000-000000000001', pg_temp.good_scores()),
  (select id from public.rounds where guest_claim_id = '70000000-0000-0000-0000-000000000001'),
  'claiming the same trial again returns the existing round'
);

select is(
  (select count(*) from public.hole_scores hs
   join public.rounds r on r.id = hs.round_id
   where r.guest_claim_id = '70000000-0000-0000-0000-000000000001'),
  4::bigint,
  'a repeated claim does not duplicate scores'
);

-- One bad score (strokes 0) fails the whole claim: no round, no guests.
select throws_ok(
  $$ select pg_temp.claim('70000000-0000-0000-0000-000000000002',
       pg_temp.good_scores() || '[{"player_id":"p2","hole_id":"30000000-0000-0000-0000-000000000002","strokes":0,"ob":false}]'::jsonb) $$,
  '23514', null,
  'a claim with an invalid score is rejected'
);

select is_empty(
  $$ select 1 from public.rounds where guest_claim_id = '70000000-0000-0000-0000-000000000002' $$,
  'a rejected claim leaves nothing behind (all or nothing)'
);

select throws_ok(
  $$ select public.claim_trial('70000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
       now(), now(), array['30000000-0000-0000-0000-000000000001']::uuid[],
       '[{"id":"p1","name":"Alice","is_scorer":true}]', '[]') $$,
  'P0001', 'Layout holes no longer match this trial.',
  'a trial whose holes no longer match the layout is rejected'
);

select throws_ok(
  $$ select pg_temp.claim('70000000-0000-0000-0000-000000000004',
       '[{"player_id":"ghost","hole_id":"30000000-0000-0000-0000-000000000001","strokes":3,"ob":false}]') $$,
  'P0001', 'Trial has a score for an unknown player.',
  'a score for an unknown player is rejected'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select throws_ok(
  $$ select pg_temp.claim('70000000-0000-0000-0000-000000000005', pg_temp.good_scores()) $$,
  '42501', null,
  'anonymous visitors cannot call claim_trial'
);

-- ---------------------------------------------------------------------------
-- accept_invite
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.act_as('b0000000-0000-0000-0000-00000000000b');
set local role authenticated;

select throws_ok(
  $$ select public.accept_invite('60000000-0000-0000-0000-000000000001') $$,
  '42501', 'Invite not found.',
  'a user cannot accept someone else''s invite'
);

select throws_ok(
  $$ select public.accept_invite('60000000-0000-0000-0000-000000000002') $$,
  'P0001', 'This invite is no longer valid.',
  'a declined invite cannot be accepted'
);

reset role;
select pg_temp.act_as('c0000000-0000-0000-0000-00000000000c');
set local role authenticated;

select is(
  public.accept_invite('60000000-0000-0000-0000-000000000001'),
  '40000000-0000-0000-0000-000000000001'::uuid,
  'accepting an invite returns the round id'
);

select results_eq(
  $$ select (select status::text from public.round_invitations where id = '60000000-0000-0000-0000-000000000001'),
            (select count(*) from public.round_participants
             where round_id = '40000000-0000-0000-0000-000000000001'
               and user_id = 'c0000000-0000-0000-0000-00000000000c'),
            public.accept_invite('60000000-0000-0000-0000-000000000001') $$,
  $$ values ('accepted', 1::bigint, '40000000-0000-0000-0000-000000000001'::uuid) $$,
  'after accepting, the invite is accepted and the user joined once (repeat accept is a no-op)'
);

select * from finish();
rollback;
