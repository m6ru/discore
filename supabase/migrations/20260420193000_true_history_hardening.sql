do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'layouts_course_id_slug_key'
      and conrelid = 'public.layouts'::regclass
  ) then
    alter table public.layouts
      add constraint layouts_course_id_slug_key unique (course_id, slug);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'round_participants_round_id_user_id_key'
      and conrelid = 'public.round_participants'::regclass
  ) then
    alter table public.round_participants
      add constraint round_participants_round_id_user_id_key unique (round_id, user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rounds_status_check'
      and conrelid = 'public.rounds'::regclass
  ) then
    alter table public.rounds
      add constraint rounds_status_check check (status in ('active', 'completed', 'abandoned'));
  end if;
end $$;

alter table public.rounds
  alter column status set default 'active';

drop policy if exists "hole_scores_update" on public.hole_scores;
create policy "hole_scores_update" on public.hole_scores for update
  to authenticated
  using (
    exists (
      select 1 from public.rounds
      where rounds.id = hole_scores.round_id
      and rounds.scorer_id = auth.uid()
      and rounds.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.rounds
      where rounds.id = hole_scores.round_id
      and rounds.scorer_id = auth.uid()
      and rounds.status = 'active'
    )
  );

create policy "rounds_delete_if_no_scores" on public.rounds for delete
  to authenticated
  using (
    auth.uid() = scorer_id
    and not exists (
      select 1 from public.hole_scores
      where hole_scores.round_id = rounds.id
    )
  );
