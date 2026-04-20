create or replace function public.is_round_member(p_round_id uuid, p_user_id uuid)
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
  )
  or exists (
    select 1
    from public.round_participants rp
    where rp.round_id = p_round_id
      and rp.user_id = p_user_id
  );
$$;

revoke all on function public.is_round_member(uuid, uuid) from public;
grant execute on function public.is_round_member(uuid, uuid) to authenticated;

drop policy if exists "rounds_select" on public.rounds;
create policy "rounds_select" on public.rounds for select
  using (public.is_round_member(rounds.id, auth.uid()));

drop policy if exists "round_participants_select" on public.round_participants;
create policy "round_participants_select" on public.round_participants for select
  using (public.is_round_member(round_participants.round_id, auth.uid()));

drop policy if exists "hole_scores_select" on public.hole_scores;
create policy "hole_scores_select" on public.hole_scores for select
  using (public.is_round_member(hole_scores.round_id, auth.uid()));
