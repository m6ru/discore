-- Telegram ping on new course suggestions. Run with: npx supabase test db
-- pg_net only sends after commit; this test rolls back, so nothing leaves the machine.
begin;
select plan(7);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'alice@test.local', 'authenticated', 'authenticated', '{"first_name":"Alice","last_name":"Sender"}');

insert into public.courses (id, name, location, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Test Park', 'Testville', 'test-park');
insert into public.layouts (id, course_id, name, total_par, total_distance_m, slug) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Main', 6, 200, 'main');
insert into public.holes (id, layout_id, hole_number, par, distance_m) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 7, 3, 80);

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.queued() returns setof text language sql as $$
  select convert_from(body, 'utf8') from net.http_request_queue
  where url like 'https://api.telegram.org/%';
$$;

-- ---------------------------------------------------------------------------
-- No secrets (local, CI): nothing is sent
-- ---------------------------------------------------------------------------
select pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');
set local role authenticated;

insert into public.course_suggestions (kind, course_id, note)
values ('other', '10000000-0000-0000-0000-000000000001', 'Without secrets');

reset role;
select is((select count(*) from pg_temp.queued()), 0::bigint, 'without Vault secrets no ping is queued');

-- ---------------------------------------------------------------------------
-- With secrets: one request per suggestion, with the details
-- ---------------------------------------------------------------------------
select vault.create_secret('TEST-TOKEN', 'telegram_bot_token');
select vault.create_secret('12345', 'telegram_chat_id');

select pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');
set local role authenticated;

insert into public.course_suggestions (kind, layout_id, hole_id, note, photo_paths)
values ('hole_info', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
        'Hole 7 is par 4 now', array['a0000000-0000-0000-0000-00000000000a/tee.jpg']);

reset role;

select is(
  (select count(*) from net.http_request_queue where url = 'https://api.telegram.org/botTEST-TOKEN/sendMessage'),
  1::bigint,
  'a suggestion queues one sendMessage request with the bot token'
);

select is(
  (select (b::jsonb)->>'chat_id' from pg_temp.queued() b),
  '12345',
  'the ping goes to the owner''s chat'
);

select matches(
  (select (b::jsonb)->>'text' from pg_temp.queued() b),
  'Hole par or length\nTest Park · Main · hole 7\nFrom: Alice Sender',
  'the message names the kind, course, layout, hole and sender'
);

select matches(
  (select (b::jsonb)->>'text' from pg_temp.queued() b),
  'Hole 7 is par 4 now\n\n1 photo',
  'the message has the note and the photo count'
);

delete from net.http_request_queue;

select pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');
set local role authenticated;

insert into public.course_suggestions (kind, course_name, location, note)
values ('new_course', 'Forest Park', 'Somewhere', '9 baskets');

reset role;

select matches(
  (select (b::jsonb)->>'text' from pg_temp.queued() b),
  'New course\nForest Park \(Somewhere\)',
  'a new course ping names the suggested course and place'
);

-- ---------------------------------------------------------------------------
-- The trigger function is not callable through the API
-- ---------------------------------------------------------------------------
select ok(
  not has_function_privilege('authenticated', 'public.course_suggestions_notify_owner()', 'execute'),
  'signed-in users cannot call the ping function'
);

select * from finish();
rollback;
