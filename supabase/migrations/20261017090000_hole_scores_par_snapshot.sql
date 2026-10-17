-- Freeze par on each score as it was when the hole was played.
--
-- Stats used the live holes.par, so correcting a par in the course seed
-- silently rewrote every past round's vs-par, birdies, and aces. Each score
-- now carries its own par: set by the database on insert (clients cannot
-- choose it) and kept on later edits. A par correction only affects rounds
-- scored after it.

alter table public.hole_scores add column par smallint;

update public.hole_scores hs
set par = h.par
from public.holes h
where h.id = hs.hole_id;

alter table public.hole_scores alter column par set not null;

-- Extend the integrity trigger from 20261016150000: it already looks up the
-- hole, so it also stamps par. On update, par is only re-read if the score
-- moves to a different hole; otherwise the stored value is kept.
create or replace function public.enforce_hole_score_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hole_par smallint;
begin
  if not exists (
    select 1
    from public.round_participants rp
    where rp.id = new.participant_id
      and rp.round_id = new.round_id
  ) then
    raise exception 'Participant does not belong to this round';
  end if;

  select h.par into hole_par
  from public.rounds r
  join public.holes h on h.layout_id = r.layout_id
  where r.id = new.round_id
    and h.id = new.hole_id;

  if not found then
    raise exception 'Hole does not belong to this round''s layout';
  end if;

  if tg_op = 'UPDATE' and new.hole_id = old.hole_id then
    new.par := old.par;
  else
    new.par := hole_par;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_hole_score_consistency_trigger on public.hole_scores;
create trigger enforce_hole_score_consistency_trigger
before insert or update of round_id, participant_id, hole_id, par on public.hole_scores
for each row
execute function public.enforce_hole_score_consistency();

-- ---------------------------------------------------------------------------
-- Stats views: score against the stored par (hs.par) instead of holes.par.
-- Column lists and types are unchanged, so dependent views stay valid.
-- ---------------------------------------------------------------------------
create or replace view public.player_round_stats
with (security_invoker = true)
as
select
  rp.user_id,
  r.id as round_id,
  rp.id as participant_id,
  r.layout_id,
  r.status,
  r.started_at,
  r.completed_at,
  c.name as course_name,
  l.name as layout_name,
  (select count(*) from public.holes h2 where h2.layout_id = r.layout_id) as layout_hole_count,
  count(hs.id) as holes_scored,
  case when count(hs.id) = 0 then null else sum(hs.strokes) end as total_strokes,
  case when count(hs.id) = 0 then null else sum(hs.par) end as total_par,
  case when count(hs.id) = 0 then null else sum(hs.strokes) - sum(hs.par) end as vs_par,
  count(*) filter (where hs.id is not null and public.score_bucket(hs.strokes, hs.par) = 'ace') as ace_count,
  count(*) filter (where hs.id is not null and public.score_bucket(hs.strokes, hs.par) = 'eagle') as eagle_count,
  count(*) filter (where hs.id is not null and public.score_bucket(hs.strokes, hs.par) = 'birdie') as birdie_count,
  count(*) filter (where hs.id is not null and public.score_bucket(hs.strokes, hs.par) = 'par') as par_count,
  count(*) filter (where hs.id is not null and public.score_bucket(hs.strokes, hs.par) = 'bogey') as bogey_count,
  count(*) filter (where hs.id is not null and public.score_bucket(hs.strokes, hs.par) = 'double_plus') as double_plus_count,
  count(*) filter (where hs.ob) as ob_holes
from public.rounds r
join public.round_participants rp on rp.round_id = r.id
join public.layouts l on l.id = r.layout_id
join public.courses c on c.id = l.course_id
left join public.hole_scores hs on hs.round_id = r.id and hs.participant_id = rp.id
where rp.user_id = auth.uid()
  and r.status in ('completed', 'abandoned')
group by rp.user_id, r.id, rp.id, r.layout_id, r.status, r.started_at, r.completed_at, c.name, l.name;

create or replace view public.player_ace_log
with (security_invoker = true)
as
select
  r.id as round_id,
  r.completed_at,
  h.hole_number,
  l.id as layout_id,
  l.name as layout_name,
  l.slug as layout_slug,
  c.name as course_name,
  c.slug as course_slug
from public.hole_scores hs
inner join public.holes h on h.id = hs.hole_id
inner join public.round_participants rp
  on rp.id = hs.participant_id and rp.round_id = hs.round_id
inner join public.rounds r on r.id = hs.round_id
inner join public.layouts l on l.id = r.layout_id
inner join public.courses c on c.id = l.course_id
where rp.user_id = auth.uid()
  and r.status = 'completed'
  and public.score_bucket(hs.strokes, hs.par) = 'ace';

-- `par` stays the hole's current par (the label shown next to the hole);
-- buckets and averages use the par each score was played at.
create or replace view public.player_layout_hole_stats
with (security_invoker = true)
as
select
  r.layout_id,
  h.id as hole_id,
  h.hole_number,
  h.par,
  count(*)::integer as times_played,
  count(*) filter (where public.score_bucket(hs.strokes, hs.par) = 'ace')::integer as ace_count,
  count(*) filter (where public.score_bucket(hs.strokes, hs.par) = 'eagle')::integer as eagle_count,
  count(*) filter (where public.score_bucket(hs.strokes, hs.par) = 'birdie')::integer as birdie_count,
  count(*) filter (where public.score_bucket(hs.strokes, hs.par) = 'par')::integer as par_count,
  count(*) filter (where public.score_bucket(hs.strokes, hs.par) = 'bogey')::integer as bogey_count,
  count(*) filter (where public.score_bucket(hs.strokes, hs.par) = 'double_plus')::integer as double_plus_count,
  count(*) filter (where hs.ob)::integer as ob_count,
  round(avg(hs.strokes - hs.par)::numeric, 1) as avg_vs_par
from public.rounds r
join public.round_participants rp on rp.round_id = r.id
join public.hole_scores hs on hs.round_id = r.id and hs.participant_id = rp.id
join public.holes h on h.id = hs.hole_id
where rp.user_id = auth.uid()
  and r.status = 'completed'
group by r.layout_id, h.id, h.hole_number, h.par;
