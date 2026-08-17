-- D-guest: public catalog browse for anonymous users, plus a narrow claim path
-- so a completed local trial can be inserted as one history round.

-- Catalog is creator-seeded and already user-read-only. Personal tables stay
-- deny-all for anon (no GRANT, no SELECT policies).
grant usage on schema public to anon;
grant select on public.courses to anon;
grant select on public.layouts to anon;
grant select on public.holes to anon;

drop policy if exists "courses_select" on public.courses;
create policy "courses_select" on public.courses
  for select to anon, authenticated
  using (true);

drop policy if exists "layouts_select" on public.layouts;
create policy "layouts_select" on public.layouts
  for select to anon, authenticated
  using (true);

drop policy if exists "holes_select" on public.holes;
create policy "holes_select" on public.holes
  for select to anon, authenticated
  using (true);

alter table public.rounds
  add column if not exists guest_claim_id uuid;

comment on column public.rounds.guest_claim_id is
  'Idempotency key for a claimed anonymous trial. Null for normal rounds.';

create unique index if not exists rounds_guest_claim_id_key
  on public.rounds (guest_claim_id)
  where guest_claim_id is not null;

-- Recreate insert policy: live scoring stays active-only. Claimed trials insert
-- completed scores in one batch; WITH CHECK cannot use "zero scores exist"
-- because later rows in the same INSERT would see earlier ones.
drop policy if exists "hole_scores_insert" on public.hole_scores;
create policy "hole_scores_insert" on public.hole_scores
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.rounds
      where rounds.id = hole_scores.round_id
        and rounds.scorer_id = (select auth.uid())
        and (
          rounds.status = 'active'
          or (
            rounds.status = 'completed'
            and rounds.guest_claim_id is not null
            and exists (
              select 1 from public.holes
              where holes.id = hole_scores.hole_id
                and holes.layout_id = rounds.layout_id
            )
          )
        )
    )
  );
