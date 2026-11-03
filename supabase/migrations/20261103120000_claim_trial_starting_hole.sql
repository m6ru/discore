-- claim_trial keeps the trial's starting hole (the trial setup now has the
-- same "Starting hole" choice as a normal draft). p_starting_hole defaults to
-- 1, so an older app that does not send it still works.
-- The old 7-argument version is dropped so there is only one claim_trial.
drop function public.claim_trial(uuid, uuid, timestamptz, timestamptz, uuid[], jsonb, jsonb);

-- claim_trial: save a finished anonymous trial as the signed-in user's round.
--   p_players: [{"id": "<local id>", "name": "...", "is_scorer": true|false}]
--   p_scores:  [{"player_id": "<local id>", "hole_id": "<uuid>", "strokes": 3, "ob": false}]
--   p_starting_hole: a hole number on the layout (play order starts there).
-- Idempotent on p_claim_id: a repeat call returns the round already saved.
-- ---------------------------------------------------------------------------
create or replace function public.claim_trial(
  p_claim_id uuid,
  p_layout_id uuid,
  p_started_at timestamptz,
  p_completed_at timestamptz,
  p_hole_ids uuid[],
  p_players jsonb,
  p_scores jsonb,
  p_starting_hole smallint default 1
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_round_id uuid;
  v_participants jsonb;
  v_scorer_key text;
  v_guest record;
  v_participant_id uuid;
begin
  if v_uid is null then
    raise exception 'Sign in to save this round.' using errcode = '42501';
  end if;

  select r.id into v_round_id
  from public.rounds r
  where r.guest_claim_id = p_claim_id and r.scorer_id = v_uid;
  if found then
    return v_round_id;
  end if;

  if (select count(*) from public.holes h where h.layout_id = p_layout_id)
       <> coalesce(cardinality(p_hole_ids), 0)
     or exists (
       select 1 from unnest(p_hole_ids) as t(hole_id)
       where not exists (
         select 1 from public.holes h where h.id = t.hole_id and h.layout_id = p_layout_id
       )
     ) then
    raise exception 'Layout holes no longer match this trial.';
  end if;

  if not exists (
    select 1 from public.holes h
    where h.layout_id = p_layout_id and h.hole_number = p_starting_hole
  ) then
    raise exception 'Starting hole is not on this layout.';
  end if;

  select p ->> 'id' into v_scorer_key
  from jsonb_array_elements(p_players) as p
  where (p ->> 'is_scorer')::boolean;
  if v_scorer_key is null then
    raise exception 'Trial is missing a scorer.';
  end if;

  begin
    insert into public.rounds (
      layout_id, scorer_id, status, started_at, completed_at, guest_claim_id, starting_hole
    ) values (
      p_layout_id, v_uid, 'completed', p_started_at, p_completed_at, p_claim_id, p_starting_hole
    )
    returning id into v_round_id;
  exception when unique_violation then
    -- Another tab claimed the same trial first; its transaction has committed.
    select r.id into v_round_id
    from public.rounds r
    where r.guest_claim_id = p_claim_id and r.scorer_id = v_uid;
    if v_round_id is null then
      raise;
    end if;
    return v_round_id;
  end;

  -- The scorer's participant row is added by the rounds insert trigger.
  select rp.id into v_participant_id
  from public.round_participants rp
  where rp.round_id = v_round_id and rp.user_id = v_uid;
  v_participants := jsonb_build_object(v_scorer_key, v_participant_id);

  for v_guest in
    select p ->> 'id' as key, btrim(p ->> 'name') as name
    from jsonb_array_elements(p_players) as p
    where not (p ->> 'is_scorer')::boolean
  loop
    insert into public.round_participants (round_id, guest_name)
    values (v_round_id, v_guest.name)
    returning id into v_participant_id;
    v_participants := v_participants || jsonb_build_object(v_guest.key, v_participant_id);
  end loop;

  if exists (
    select 1 from jsonb_array_elements(p_scores) as s
    where not v_participants ? (s ->> 'player_id')
  ) then
    raise exception 'Trial has a score for an unknown player.';
  end if;

  insert into public.hole_scores (round_id, participant_id, hole_id, strokes, ob)
  select v_round_id, (v_participants ->> s.player_id)::uuid, s.hole_id, s.strokes, s.ob
  from jsonb_to_recordset(p_scores) as s(player_id text, hole_id uuid, strokes integer, ob boolean);

  return v_round_id;
end;
$$;

revoke all on function public.claim_trial(uuid, uuid, timestamptz, timestamptz, uuid[], jsonb, jsonb, smallint) from public, anon;
grant execute on function public.claim_trial(uuid, uuid, timestamptz, timestamptz, uuid[], jsonb, jsonb, smallint) to authenticated;
