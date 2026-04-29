drop policy if exists "round_participants_insert" on public.round_participants;
create policy "round_participants_insert" on public.round_participants for insert
  to authenticated
  with check (
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
  );
