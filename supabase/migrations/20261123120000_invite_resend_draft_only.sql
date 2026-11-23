-- Re-sending an invite sets the existing row back to 'pending' (the table is
-- unique on round + user). Only allow that while the round is still a draft,
-- like a new invite; cancelling stays allowed at any time.
drop policy if exists "round_invitations_update" on public.round_invitations;
create policy "round_invitations_update" on public.round_invitations for update
  to authenticated
  using (
    auth.uid() = invited_user_id
    or public.is_round_scorer(round_id, auth.uid())
  )
  with check (
    (
      auth.uid() = invited_user_id
      and status in ('accepted', 'declined')
    )
    or (
      public.is_round_scorer(round_id, auth.uid())
      and (
        status = 'cancelled'
        or (
          status = 'pending'
          and exists (
            select 1
            from public.rounds r
            where r.id = round_id
              and r.status = 'draft'
          )
        )
      )
    )
  );
