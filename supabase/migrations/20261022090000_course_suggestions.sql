-- Course suggestions: signed-in users report a problem with a course or suggest
-- a new one (note + up to 3 photos). The owner reviews them in the app and
-- applies accepted ones through the seed JSON (git stays the source of truth).

-- ---------------------------------------------------------------------------
-- app_admins: who may review. Rows are added by hand in the dashboard SQL
-- editor (service role); RLS with no policies hides the table from the API.
-- ---------------------------------------------------------------------------
create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

revoke execute on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- course_suggestions
-- ---------------------------------------------------------------------------
create table public.course_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in (
    'hole_info', 'layout_changed', 'new_layout', 'course_closed', 'other', 'new_course'
  )),
  course_id uuid references public.courses (id) on delete set null,
  layout_id uuid references public.layouts (id) on delete set null,
  course_name text check (char_length(course_name) <= 200),
  location text check (char_length(location) <= 200),
  note text not null check (char_length(btrim(note)) between 1 and 2000),
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 3),
  status text not null default 'new' check (status in ('new', 'applied', 'rejected')),
  owner_note text check (char_length(owner_note) <= 500),
  reviewed_at timestamptz,
  thanked_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index course_suggestions_status_idx on public.course_suggestions (status, created_at desc);
create index course_suggestions_user_idx on public.course_suggestions (user_id, created_at desc);

alter table public.course_suggestions enable row level security;

create policy course_suggestions_select on public.course_suggestions
  for select to authenticated
  using (user_id = auth.uid() or public.is_app_admin());

create policy course_suggestions_insert on public.course_suggestions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'new'
    and owner_note is null
    and reviewed_at is null
    and thanked_seen_at is null
  );

-- Who may change which column is enforced by the trigger below.
create policy course_suggestions_update on public.course_suggestions
  for update to authenticated
  using (user_id = auth.uid() or public.is_app_admin())
  with check (user_id = auth.uid() or public.is_app_admin());

-- No delete policy: suggestions are kept.

grant select, insert, update on public.course_suggestions to authenticated;

create function public.course_suggestions_before_insert()
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
  else
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

create trigger course_suggestions_before_insert
  before insert on public.course_suggestions
  for each row execute function public.course_suggestions_before_insert();

-- The sender may only mark the thank-you as seen; the admin may only review
-- (status, owner_note). reviewed_at is stamped here, never by the client.
create function public.course_suggestions_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.user_id, new.kind, new.course_id, new.layout_id, new.course_name, new.location,
      new.note, new.photo_paths, new.created_at)
     is distinct from
     (old.user_id, old.kind, old.course_id, old.layout_id, old.course_name, old.location,
      old.note, old.photo_paths, old.created_at) then
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

create trigger course_suggestions_before_update
  before update on public.course_suggestions
  for each row execute function public.course_suggestions_before_update();

-- ---------------------------------------------------------------------------
-- Photos: private bucket. Sender uploads into their own folder; only the
-- sender and admins can read. The client converts to JPEG before upload.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-suggestion-photos', 'course-suggestion-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy course_suggestion_photos_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'course-suggestion-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy course_suggestion_photos_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'course-suggestion-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_app_admin())
  );
