-- RLS + data-integrity hardening (see supabase/tests/rls_test.sql).
--
-- The app already follows these rules in the UI; this makes the database
-- enforce them, so hand-crafted API calls (publishable key + own JWT) cannot
-- bypass them.

-- ---------------------------------------------------------------------------
-- 1. Participants: the scorer may add only named guests directly. Registered
--    users join themselves after an invite (or via the scorer trigger, which is
--    SECURITY DEFINER and unaffected by this policy).
-- ---------------------------------------------------------------------------
drop policy if exists "round_participants_insert" on public.round_participants;
create policy "round_participants_insert" on public.round_participants
  for insert
  to authenticated
  with check (
    (
      exists (
        select 1
        from public.rounds r
        where r.id = round_id
          and r.status = 'draft'
      )
      and (
        (
          user_id is null
          and public.is_round_scorer(round_id, (select auth.uid()))
        )
        or (
          user_id = (select auth.uid())
          and public.has_round_invite(round_id, (select auth.uid()))
        )
      )
    )
    or (
      guest_name is not null
      and user_id is null
      and exists (
        select 1
        from public.rounds r
        where r.id = round_id
          and r.status = 'completed'
          and r.guest_claim_id is not null
          and r.scorer_id = (select auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Rounds start as drafts. The only exception is a claimed anonymous trial,
--    which arrives already completed and carries its idempotency key.
-- ---------------------------------------------------------------------------
drop policy if exists "rounds_insert" on public.rounds;
create policy "rounds_insert" on public.rounds
  for insert
  to authenticated
  with check (
    scorer_id = (select auth.uid())
    and (
      (status = 'draft' and guest_claim_id is null)
      or (status = 'completed' and guest_claim_id is not null)
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Round updates by app users: forward-only status, layout fixed once the
--    round starts, claim key immutable. Applies to the `authenticated` role
--    only, so the dashboard / service role can still repair data.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_round_update_rules()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'draft' and new.status in ('active', 'abandoned'))
    or (old.status = 'active' and new.status in ('completed', 'abandoned'))
  ) then
    raise exception 'Round status cannot change from % to %', old.status, new.status;
  end if;

  if new.layout_id is distinct from old.layout_id and old.status <> 'draft' then
    raise exception 'Layout cannot change after the round has started';
  end if;

  if new.guest_claim_id is distinct from old.guest_claim_id then
    raise exception 'guest_claim_id cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_round_update_rules_trigger on public.rounds;
create trigger enforce_round_update_rules_trigger
before update on public.rounds
for each row
execute function public.enforce_round_update_rules();

-- ---------------------------------------------------------------------------
-- 4. Every score must point at a participant of the same round and a hole of
--    the round's layout. SECURITY DEFINER so the check sees the rows even
--    where the caller's RLS would hide them.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_hole_score_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.round_participants rp
    where rp.id = new.participant_id
      and rp.round_id = new.round_id
  ) then
    raise exception 'Participant does not belong to this round';
  end if;

  if not exists (
    select 1
    from public.rounds r
    join public.holes h on h.layout_id = r.layout_id
    where r.id = new.round_id
      and h.id = new.hole_id
  ) then
    raise exception 'Hole does not belong to this round''s layout';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_hole_score_consistency() from public;

drop trigger if exists enforce_hole_score_consistency_trigger on public.hole_scores;
create trigger enforce_hole_score_consistency_trigger
before insert or update of round_id, participant_id, hole_id on public.hole_scores
for each row
execute function public.enforce_hole_score_consistency();

-- ---------------------------------------------------------------------------
-- 5. Strokes range (matches the scoring UI).
-- ---------------------------------------------------------------------------
alter table public.hole_scores
  add constraint hole_scores_strokes_range check (strokes between 1 and 25);

-- ---------------------------------------------------------------------------
-- 6. Course maintenance must never delete play history: deleting a layout or
--    hole that has rounds/scores is refused. Retire layouts with is_active.
-- ---------------------------------------------------------------------------
alter table public.rounds
  drop constraint rounds_layout_id_fkey,
  add constraint rounds_layout_id_fkey
    foreign key (layout_id) references public.layouts (id) on delete restrict;

alter table public.hole_scores
  drop constraint hole_scores_hole_id_fkey,
  add constraint hole_scores_hole_id_fkey
    foreign key (hole_id) references public.holes (id) on delete restrict;
