-- New course suggestions (C2 form): the phone's position instead of a typed
-- town, a basket count, up to 6 photos, and the note becomes optional for a
-- new course (the course board photo says the rest).

alter table public.course_suggestions
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180),
  add column basket_count smallint check (basket_count between 1 and 99);

alter table public.course_suggestions
  drop constraint course_suggestions_photo_paths_check,
  add constraint course_suggestions_photo_paths_check check (cardinality(photo_paths) <= 6);

alter table public.course_suggestions
  drop constraint course_suggestions_note_check,
  add constraint course_suggestions_note_check check (char_length(note) <= 2000);

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

  if (new.lat is null) <> (new.lng is null) then
    raise exception 'Location needs both latitude and longitude';
  end if;

  if new.kind = 'new_course' then
    if new.course_name is null then
      raise exception 'A new course needs a name';
    end if;
    if new.location is null and new.lat is null then
      raise exception 'A new course needs a location';
    end if;
    new.course_id := null;
    new.layout_id := null;
    new.hole_id := null;
  else
    if new.note = '' then
      raise exception 'Please add a short note';
    end if;
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
    new.lat := null;
    new.lng := null;
    new.basket_count := null;
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
      new.location, new.lat, new.lng, new.basket_count, new.note, new.photo_paths, new.created_at)
     is distinct from
     (old.user_id, old.kind, old.course_id, old.layout_id, old.hole_id, old.course_name,
      old.location, old.lat, old.lng, old.basket_count, old.note, old.photo_paths, old.created_at) then
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

-- The ping also says where a new course is (a map link) and how many baskets.
create or replace function public.course_suggestions_notify_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  bot_token text;
  chat_id text;
  sender text;
  place text;
  kind_label text;
  photos int;
  message text;
begin
  select decrypted_secret into bot_token from vault.decrypted_secrets where name = 'telegram_bot_token';
  select decrypted_secret into chat_id from vault.decrypted_secrets where name = 'telegram_chat_id';
  if bot_token is null or chat_id is null then
    return null;
  end if;

  select p.display_name into sender from public.profiles p where p.id = new.user_id;

  if new.kind = 'new_course' then
    place := new.course_name
      || coalesce(' (' || new.location || ')', '')
      || coalesce(' · ' || new.basket_count || ' baskets', '')
      || coalesce(E'\nhttps://maps.google.com/?q=' || new.lat || ',' || new.lng, '');
  else
    select c.name
      || coalesce(' · ' || l.name, '')
      || coalesce(' · hole ' || h.hole_number, '')
      into place
    from public.courses c
    left join public.layouts l on l.id = new.layout_id
    left join public.holes h on h.id = new.hole_id
    where c.id = new.course_id;
  end if;

  -- Same labels as lib/courses/course-suggestions.ts.
  kind_label := case new.kind
    when 'hole_info' then 'Hole par or length'
    when 'layout_changed' then 'Layout changed or re-set'
    when 'new_layout' then 'New layout'
    when 'course_closed' then 'Course closed'
    when 'new_course' then 'New course'
    else 'Something else'
  end;

  photos := cardinality(new.photo_paths);

  message := 'New course suggestion: ' || kind_label || E'\n'
    || coalesce(place, '?') || E'\n'
    || 'From: ' || coalesce(sender, '?')
    || case when new.note <> '' then E'\n\n' || left(new.note, 1000) else '' end
    || case when photos > 0 then E'\n\n' || photos || ' photo(s)' else '' end
    || E'\n\nhttps://discore-eta.vercel.app/admin/suggestions';

  perform net.http_post(
    url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    body := jsonb_build_object('chat_id', chat_id, 'text', message, 'link_preview_options', jsonb_build_object('is_disabled', true))
  );
  return null;
exception when others then
  -- A ping is nice to have; never lose the suggestion over it.
  raise warning 'course suggestion ping failed: %', sqlerrm;
  return null;
end;
$$;
