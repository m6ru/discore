create table if not exists public.round_invitations (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  invited_user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (round_id, invited_user_id)
);

alter table public.round_invitations enable row level security;

create policy "round_invitations_select" on public.round_invitations for select
  using (
    auth.uid() = invited_user_id
    or exists (
      select 1 from public.rounds
      where rounds.id = round_invitations.round_id
      and rounds.scorer_id = auth.uid()
    )
  );

create policy "round_invitations_insert" on public.round_invitations for insert
  to authenticated
  with check (
    auth.uid() = invited_by
    and status = 'pending'
    and exists (
      select 1 from public.rounds
      where rounds.id = round_id
      and rounds.scorer_id = auth.uid()
      and rounds.status = 'draft'
    )
  );

create policy "round_invitations_update" on public.round_invitations for update
  to authenticated
  using (
    auth.uid() = invited_user_id
    or exists (
      select 1 from public.rounds
      where rounds.id = round_invitations.round_id
      and rounds.scorer_id = auth.uid()
    )
  )
  with check (
    (
      auth.uid() = invited_user_id
      and status in ('accepted', 'declined')
    )
    or (
      exists (
        select 1 from public.rounds
        where rounds.id = round_id
        and rounds.scorer_id = auth.uid()
      )
      and status in ('pending', 'cancelled')
    )
  );

drop policy if exists "rounds_select" on public.rounds;
create policy "rounds_select" on public.rounds for select
  using (
    public.is_round_member(rounds.id, auth.uid())
    or exists (
      select 1 from public.round_invitations ri
      where ri.round_id = rounds.id
      and ri.invited_user_id = auth.uid()
      and ri.status = 'pending'
    )
  );

drop policy if exists "round_participants_insert" on public.round_participants;
create policy "round_participants_insert" on public.round_participants for insert
  to authenticated
  with check (
    exists (
      select 1 from public.rounds
      where rounds.id = round_id
      and (
        rounds.scorer_id = auth.uid()
        or (
          user_id = auth.uid()
          and exists (
            select 1 from public.round_invitations ri
            where ri.round_id = round_id
            and ri.invited_user_id = auth.uid()
            and ri.status in ('pending', 'accepted')
          )
        )
      )
    )
  );
