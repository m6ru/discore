alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists birth_year integer,
  add column if not exists city text;

alter table public.profiles
  drop constraint if exists profiles_gender_check;

alter table public.profiles
  add constraint profiles_gender_check
  check (gender is null or gender in ('female', 'male'));

alter table public.profiles
  drop constraint if exists profiles_birth_year_check;

alter table public.profiles
  add constraint profiles_birth_year_check
  check (birth_year is null or (birth_year between 1900 and extract(year from now())::integer));

insert into storage.buckets (id, name, public)
values ('profile-pictures', 'profile-pictures', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "profile_pictures_public_read" on storage.objects;
create policy "profile_pictures_public_read"
on storage.objects
for select
to public
using (bucket_id = 'profile-pictures');

drop policy if exists "profile_pictures_insert_own" on storage.objects;
create policy "profile_pictures_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile_pictures_update_own" on storage.objects;
create policy "profile_pictures_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
);
