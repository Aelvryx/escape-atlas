begin;

create extension if not exists pgcrypto;

do $$
begin
  create type public.subscription_tier as enum ('free', 'enthusiast', 'group');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  bio text check (char_length(bio) <= 500),
  home_location text check (char_length(home_location) <= 120),
  avatar_url text,
  is_public boolean not null default true,
  subscription_tier public.subscription_tier not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 160),
  location text not null check (char_length(location) between 1 and 160),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  website_url text,
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, slug)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 160),
  allotted_minutes integer check (allotted_minutes between 1 and 360),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, slug)
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete restrict,
  played_on date not null,
  escaped boolean,
  completion_seconds integer check (completion_seconds is null or completion_seconds > 0),
  players integer not null default 2 check (players between 1 and 100),
  public_note text check (char_length(public_note) <= 2000),
  photo_url text,
  source_ref text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, profile_id)
);

create unique index if not exists visits_profile_source_ref_unique
  on public.visits (profile_id, source_ref)
  where source_ref is not null;

create index if not exists visits_profile_played_on_idx
  on public.visits (profile_id, played_on desc);

create index if not exists visits_room_id_idx
  on public.visits (room_id);

create table if not exists public.visit_private_notes (
  visit_id uuid primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  note text not null check (char_length(note) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (visit_id, profile_id)
    references public.visits (id, profile_id) on delete cascade
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null unique,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  overall_rating smallint check (overall_rating between 1 and 5),
  difficulty_rating smallint check (difficulty_rating between 1 and 5),
  immersion_rating smallint check (immersion_rating between 1 and 5),
  review_text text check (char_length(review_text) <= 5000),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (visit_id, profile_id)
    references public.visits (id, profile_id) on delete cascade
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists venues_set_updated_at on public.venues;
create trigger venues_set_updated_at
before update on public.venues
for each row execute function public.set_updated_at();

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

drop trigger if exists visits_set_updated_at on public.visits;
create trigger visits_set_updated_at
before update on public.visits
for each row execute function public.set_updated_at();

drop trigger if exists visit_private_notes_set_updated_at on public.visit_private_notes;
create trigger visit_private_notes_set_updated_at
before update on public.visit_private_notes
for each row execute function public.set_updated_at();

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, slug, display_name)
  values (
    new.id,
    'explorer-' || substr(new.id::text, 1, 8),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'New explorer')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.rooms enable row level security;
alter table public.visits enable row level security;
alter table public.visit_private_notes enable row level security;
alter table public.reviews enable row level security;

create policy "Public profiles are readable"
on public.profiles for select
using (is_public or auth.uid() = id);

create policy "Users can insert their own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Venues are readable"
on public.venues for select
using (true);

create policy "Users can add venues"
on public.venues for insert
with check (auth.uid() = created_by);

create policy "Creators can update venues"
on public.venues for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "Creators can delete venues"
on public.venues for delete
using (auth.uid() = created_by);

create policy "Rooms are readable"
on public.rooms for select
using (true);

create policy "Users can add rooms"
on public.rooms for insert
with check (auth.uid() = created_by);

create policy "Creators can update rooms"
on public.rooms for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "Creators can delete rooms"
on public.rooms for delete
using (auth.uid() = created_by);

create policy "Public visits are readable"
on public.visits for select
using (
  profile_id = auth.uid()
  or (
    is_public
    and exists (
      select 1
      from public.profiles
      where profiles.id = visits.profile_id
        and profiles.is_public
    )
  )
);

create policy "Users can add their own visits"
on public.visits for insert
with check (auth.uid() = profile_id);

create policy "Users can update their own visits"
on public.visits for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "Users can delete their own visits"
on public.visits for delete
using (auth.uid() = profile_id);

create policy "Private notes belong to their user"
on public.visit_private_notes for select
using (auth.uid() = profile_id);

create policy "Users can add their own private notes"
on public.visit_private_notes for insert
with check (auth.uid() = profile_id);

create policy "Users can update their own private notes"
on public.visit_private_notes for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "Users can delete their own private notes"
on public.visit_private_notes for delete
using (auth.uid() = profile_id);

create policy "Public reviews are readable"
on public.reviews for select
using (
  profile_id = auth.uid()
  or (
    is_public
    and exists (
      select 1
      from public.profiles
      where profiles.id = reviews.profile_id
        and profiles.is_public
    )
    and exists (
      select 1
      from public.visits
      where visits.id = reviews.visit_id
        and visits.is_public
    )
  )
);

create policy "Users can add their own reviews"
on public.reviews for insert
with check (auth.uid() = profile_id);

create policy "Users can update their own reviews"
on public.reviews for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "Users can delete their own reviews"
on public.reviews for delete
using (auth.uid() = profile_id);

comment on table public.profiles is 'Public identity and subscription state for an Escape Atlas user.';
comment on table public.visits is 'A user playing a room; this is the core import and statistics record.';
comment on table public.visit_private_notes is 'Private visit notes separated from public visit rows so profile visibility cannot expose them.';

commit;
