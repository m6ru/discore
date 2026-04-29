create or replace function public.is_round_scorer(p_round_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rounds r
    where r.id = p_round_id
      and r.scorer_id = p_user_id
  );
$$;

create or replace function public.has_round_invite(p_round_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.round_invitations ri
    where ri.round_id = p_round_id
      and ri.invited_user_id = p_user_id
      and ri.status = 'pending'
  );
$$;

revoke all on function public.is_round_scorer(uuid, uuid) from public;
grant execute on function public.is_round_scorer(uuid, uuid) to authenticated;

revoke all on function public.has_round_invite(uuid, uuid) from public;
grant execute on function public.has_round_invite(uuid, uuid) to authenticated;

drop policy if exists "round_invitations_select" on public.round_invitations;
create policy "round_invitations_select" on public.round_invitations for select
  using (
    auth.uid() = invited_user_id
    or public.is_round_scorer(round_id, auth.uid())
  );

drop policy if exists "round_invitations_insert" on public.round_invitations;
create policy "round_invitations_insert" on public.round_invitations for insert
  to authenticated
  with check (
    auth.uid() = invited_by
    and status = 'pending'
    and public.is_round_scorer(round_id, auth.uid())
    and exists (
      select 1
      from public.rounds r
      where r.id = round_id
        and r.status = 'draft'
    )
  );

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
      and status in ('pending', 'cancelled')
    )
  );

drop policy if exists "rounds_select" on public.rounds;
create policy "rounds_select" on public.rounds for select
  using (
    public.is_round_member(rounds.id, auth.uid())
    or public.has_round_invite(rounds.id, auth.uid())
  );

drop policy if exists "round_participants_insert" on public.round_participants;
create policy "round_participants_insert" on public.round_participants for insert
  to authenticated
  with check (
    public.is_round_scorer(round_id, auth.uid())
    or (
      user_id = auth.uid()
      and public.has_round_invite(round_id, auth.uid())
    )
  );
