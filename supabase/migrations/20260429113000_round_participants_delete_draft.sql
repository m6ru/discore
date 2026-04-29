drop policy if exists "round_participants_delete" on public.round_participants;
create policy "round_participants_delete" on public.round_participants for delete
  to authenticated
  using (
    public.is_round_scorer(round_id, auth.uid())
    and exists (
      select 1
      from public.rounds r
      where r.id = round_participants.round_id
        and r.status = 'draft'
    )
  );
