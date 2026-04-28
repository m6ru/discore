alter table public.rounds
  drop constraint if exists rounds_status_check;

alter table public.rounds
  add constraint rounds_status_check
  check (status in ('draft', 'active', 'completed', 'abandoned'));

alter table public.rounds
  alter column status set default 'draft';

create unique index if not exists rounds_one_active_per_scorer_idx
  on public.rounds (scorer_id)
  where status = 'active';
