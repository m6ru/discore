-- Invariant: the scorer of a round is always a member of `round_participants`.
-- Previously this was enforced by a two-step client INSERT in
-- `app/rounds/new/create-round-form.tsx` plus a self-heal block in
-- `app/rounds/[roundId]/page.tsx`. Move it into the database where it cannot
-- race or get bypassed by partial failures.

create or replace function public.ensure_scorer_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.round_participants (round_id, user_id)
  values (new.id, new.scorer_id)
  on conflict (round_id, user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.ensure_scorer_participant() from public;

drop trigger if exists ensure_scorer_participant_trigger on public.rounds;
create trigger ensure_scorer_participant_trigger
after insert on public.rounds
for each row
execute function public.ensure_scorer_participant();

-- Backfill for any pre-existing rounds that historically slipped past the
-- previous client-side insert.
insert into public.round_participants (round_id, user_id)
select r.id, r.scorer_id
from public.rounds r
where not exists (
  select 1 from public.round_participants rp
  where rp.round_id = r.id
    and rp.user_id = r.scorer_id
)
on conflict (round_id, user_id) do nothing;
