create policy "profiles_select" on public.profiles for select
  using (auth.uid() = id or visibility = 'public');

create policy "profiles_update" on public.profiles for update
  using (auth.uid() = id);

create policy "courses_select" on public.courses for select
  to authenticated using (true);

create policy "layouts_select" on public.layouts for select
  to authenticated using (true);

create policy "holes_select" on public.holes for select
  to authenticated using (true);

create policy "rounds_select" on public.rounds for select
  using (
    auth.uid() = scorer_id
    or exists (
      select 1 from public.round_participants
      where round_participants.round_id = rounds.id
      and round_participants.user_id = auth.uid()
    )
  );

create policy "rounds_insert" on public.rounds for insert
  to authenticated with check (auth.uid() = scorer_id);

create policy "rounds_update" on public.rounds for update
  using (auth.uid() = scorer_id);

create policy "round_participants_select" on public.round_participants for select
  using (
    exists (
      select 1 from public.round_participants as rp
      where rp.round_id = round_participants.round_id
      and rp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.rounds
      where rounds.id = round_participants.round_id
      and rounds.scorer_id = auth.uid()
    )
  );

create policy "round_participants_insert" on public.round_participants for insert
  to authenticated with check (
    exists (
      select 1 from public.rounds
      where rounds.id = round_id
      and (
        rounds.scorer_id = auth.uid()
        or rounds.status = 'active'
      )
    )
  );

create policy "hole_scores_select" on public.hole_scores for select
  using (
    exists (
      select 1 from public.round_participants
      where round_participants.id = hole_scores.participant_id
      and exists (
        select 1 from public.round_participants as rp2
        where rp2.round_id = round_participants.round_id
        and rp2.user_id = auth.uid()
      )
    )
  );

create policy "hole_scores_insert" on public.hole_scores for insert
  with check (
    exists (
      select 1 from public.rounds
      where rounds.id = hole_scores.round_id
      and rounds.scorer_id = auth.uid()
      and rounds.status = 'active'
    )
  );

create policy "hole_scores_update" on public.hole_scores for update
  using (
    exists (
      select 1 from public.rounds
      where rounds.id = hole_scores.round_id
      and rounds.scorer_id = auth.uid()
      and rounds.status = 'active'
    )
  );
