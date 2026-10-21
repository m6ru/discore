-- Hole-level suggestions from the scoring screen ("Wrong info?"): a suggestion
-- can point at one hole. The client sends layout + hole; the course is derived.

alter table public.course_suggestions
  add column hole_id uuid references public.holes (id) on delete set null;

create or replace function public.course_suggestions_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  path text;
begin
  new.note := btrim(new.note);
  new.course_name := nullif(btrim(new.course_name), '');
  new.location := nullif(btrim(new.location), '');

  if new.kind = 'new_course' then
    if new.course_name is null then
      raise exception 'A new course needs a name';
    end if;
    new.course_id := null;
    new.layout_id := null;
    new.hole_id := null;
  else
    if new.hole_id is not null then
      if new.layout_id is null or not exists (
        select 1 from public.holes h where h.id = new.hole_id and h.layout_id = new.layout_id
      ) then
        raise exception 'Hole does not belong to this layout';
      end if;
    end if;
    if new.course_id is null and new.layout_id is not null then
      select l.course_id into new.course_id from public.layouts l where l.id = new.layout_id;
    end if;
    if new.course_id is null then
      raise exception 'A suggestion needs a course';
    end if;
    if new.layout_id is not null and not exists (
      select 1 from public.layouts l where l.id = new.layout_id and l.course_id = new.course_id
    ) then
      raise exception 'Layout does not belong to this course';
    end if;
    new.course_name := null;
    new.location := null;
  end if;

  -- Photos must be the sender's own uploads.
  foreach path in array new.photo_paths loop
    if path not like new.user_id::text || '/%' then
      raise exception 'Photo does not belong to the sender';
    end if;
  end loop;

  -- Spam guard: 10 suggestions per user per day.
  if (
    select count(*) from public.course_suggestions s
    where s.user_id = new.user_id and s.created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'Too many suggestions today — try again tomorrow';
  end if;

  return new;
end;
$$;

create or replace function public.course_suggestions_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.user_id, new.kind, new.course_id, new.layout_id, new.hole_id, new.course_name,
      new.location, new.note, new.photo_paths, new.created_at)
     is distinct from
     (old.user_id, old.kind, old.course_id, old.layout_id, old.hole_id, old.course_name,
      old.location, old.note, old.photo_paths, old.created_at) then
    raise exception 'A suggestion''s content cannot be changed';
  end if;

  if public.is_app_admin() then
    if new.thanked_seen_at is distinct from old.thanked_seen_at and old.user_id <> auth.uid() then
      raise exception 'Only the sender can dismiss the thank-you';
    end if;
  elsif (new.status, new.owner_note) is distinct from (old.status, old.owner_note) then
    raise exception 'Only an admin can review suggestions';
  end if;

  if new.status is distinct from old.status then
    new.reviewed_at := case when new.status = 'new' then null else now() end;
  else
    new.reviewed_at := old.reviewed_at;
  end if;

  return new;
end;
$$;
