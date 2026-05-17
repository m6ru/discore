-- OB becomes a boolean per hole_score row (any OB on the hole = true), driving
-- a red marker on the scorecard later. The previous `smallint` counter is
-- converted via `(value > 0)` so historic rows preserve intent.
--
-- The `putts` column is dropped: it will be reintroduced later as part of
-- advanced stats (per-attempt C1 / C2 attempts + makes), which require a
-- different shape than a single putt count and gate behind a per-round
-- "Track advanced stats" toggle.
--
-- `fairway_hit` is intentionally left as-is for the future advanced-stats slice.

alter table public.hole_scores
  alter column ob drop default,
  alter column ob type boolean using (ob > 0),
  alter column ob set default false;

-- The original column was `not null default 0`; the type conversion preserves
-- the not-null constraint, but we re-assert it here for clarity.
alter table public.hole_scores
  alter column ob set not null;

alter table public.hole_scores
  drop column putts;
