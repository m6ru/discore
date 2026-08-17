-- D-guest: scorer may insert named guests when claiming a completed local trial.
-- Live draft/invite participant inserts stay unchanged.

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
        public.is_round_scorer(round_id, auth.uid())
        or (
          user_id = auth.uid()
          and public.has_round_invite(round_id, auth.uid())
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
