-- Optional display name for a round (practice session, tournament heat, etc.)
alter table public.rounds
  add column if not exists name text;

comment on column public.rounds.name is 'User-facing round or competition title shown in the scorer UI.';
