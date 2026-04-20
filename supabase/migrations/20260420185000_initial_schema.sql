create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  gender text check (gender in ('mees', 'naine', 'muu')),
  date_of_birth date,
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.email, new.id::text));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  lat double precision,
  lng double precision,
  terrain_type text,
  difficulty_tier text,
  details text,
  source_url text,
  slug text not null unique,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create table public.layouts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  name text not null,
  total_par smallint not null,
  total_distance_m smallint not null,
  map_url text,
  is_active boolean not null default true,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (course_id, slug)
);

alter table public.layouts enable row level security;

create table public.holes (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references public.layouts (id) on delete cascade,
  hole_number smallint not null,
  par smallint not null,
  distance_m smallint not null,
  notes text,
  hole_map_url text,
  created_at timestamptz not null default now(),
  unique (layout_id, hole_number)
);

alter table public.holes enable row level security;

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  scorer_id uuid not null references public.profiles (id) on delete cascade,
  layout_id uuid not null references public.layouts (id) on delete cascade,
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  starting_hole smallint not null default 1,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  tournament_id uuid,
  created_at timestamptz not null default now()
);

alter table public.rounds enable row level security;

create table public.round_participants (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  guest_name text,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (
    (user_id is not null and guest_name is null)
    or (user_id is null and guest_name is not null)
  )
);

alter table public.round_participants enable row level security;

create table public.hole_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  participant_id uuid not null references public.round_participants (id) on delete cascade,
  hole_id uuid not null references public.holes (id) on delete cascade,
  strokes smallint not null,
  putts smallint,
  ob smallint not null default 0,
  fairway_hit boolean,
  created_at timestamptz not null default now(),
  unique (round_id, participant_id, hole_id)
);

alter table public.hole_scores enable row level security;
