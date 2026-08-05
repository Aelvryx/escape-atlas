\set ON_ERROR_STOP on

create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (
  id uuid primary key,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

\ir ../supabase/migrations/20260805073700_multi_user_foundation.sql
\ir ../supabase/migrations/20260805094000_authenticated_csv_import.sql

insert into auth.users (id, raw_user_meta_data)
values (
  '11111111-1111-4111-8111-111111111111',
  '{"display_name":"Migration tester"}'::jsonb
);

do $$
begin
  if not has_function_privilege('authenticated', 'public.import_visits(jsonb)', 'execute') then
    raise exception 'authenticated role cannot execute import_visits';
  end if;

  if has_function_privilege('anon', 'public.import_visits(jsonb)', 'execute') then
    raise exception 'anon role can execute import_visits';
  end if;

  if (select count(*) from public.profiles) <> 1 then
    raise exception 'new-user trigger did not create a profile';
  end if;
end;
$$;

insert into auth.users (id, raw_user_meta_data)
values (
  '22222222-2222-4222-8222-222222222222',
  '{"display_name":"Anthony & Trenna"}'::jsonb
);

set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);

\ir ../migration/canonical-history.sql
\ir ../migration/canonical-history.sql

reset role;

do $$
declare
  v_profile_id uuid := '22222222-2222-4222-8222-222222222222';
begin
  if (select count(*) from public.visits where profile_id = v_profile_id) <> 164 then
    raise exception 'canonical history did not produce exactly 164 visits';
  end if;

  if (select count(*) from public.venues where created_by = v_profile_id) <> 95 then
    raise exception 'canonical history did not produce exactly 95 venue/location identities';
  end if;

  if (select count(*) from public.rooms where created_by = v_profile_id) <> 164 then
    raise exception 'canonical history did not preserve exactly 164 room identities';
  end if;

  if (select count(*) from public.visits where profile_id = v_profile_id and completion_seconds is not null) <> 157 then
    raise exception 'canonical history timed-visit count differs from source';
  end if;

  if (select count(*) from public.visits where profile_id = v_profile_id and public_note is not null) <> 5 then
    raise exception 'canonical history public-note count differs from source';
  end if;

  if (select count(*) from public.visits where profile_id = v_profile_id and escaped is null) <> 164 then
    raise exception 'canonical migration invented escape outcomes';
  end if;

  if (select count(distinct source_ref) from public.visits where profile_id = v_profile_id) <> 164 then
    raise exception 'canonical migration collapsed source identities';
  end if;

  if (
    select min(played_on)::text || '|' || max(played_on)::text
    from public.visits
    where profile_id = v_profile_id
  ) <> '2015-11-28|2026-07-13' then
    raise exception 'canonical migration date range differs from source';
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

select public.import_visits(
  '[{
    "source_ref":"csv:v1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "played_on":"2026-08-05",
    "location":"Reading",
    "venue_name":"Example Escapes",
    "venue_slug":"example-escapes-reading-a1b2c3d",
    "room_name":"The Example Room",
    "room_slug":"the-example-room-a1b2c3d",
    "allotted_minutes":60,
    "escaped":true,
    "completion_seconds":2910,
    "players":2,
    "public_note":"First import"
  }]'::jsonb
);

select public.import_visits(
  '[{
    "source_ref":"csv:v1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "played_on":"2026-08-05",
    "location":"Reading",
    "venue_name":"Example Escapes",
    "venue_slug":"example-escapes-reading-a1b2c3d",
    "room_name":"The Example Room",
    "room_slug":"the-example-room-a1b2c3d",
    "allotted_minutes":60,
    "escaped":true,
    "completion_seconds":2910,
    "players":2,
    "public_note":"Idempotent update"
  }]'::jsonb
);

reset role;

do $$
declare
  v_visits_before integer;
begin
  if (select count(*) from public.venues where created_by = '11111111-1111-4111-8111-111111111111') <> 1
    or (select count(*) from public.rooms where created_by = '11111111-1111-4111-8111-111111111111') <> 1
    or (select count(*) from public.visits where profile_id = '11111111-1111-4111-8111-111111111111') <> 1 then
    raise exception 'repeat import created duplicate entities';
  end if;

  if (
    select public_note
    from public.visits
    where profile_id = '11111111-1111-4111-8111-111111111111'
    limit 1
  ) <> 'Idempotent update' then
    raise exception 'repeat import did not update the existing visit';
  end if;

  select count(*) into v_visits_before from public.visits;
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

  begin
    perform public.import_visits(
      '[
        {
          "source_ref":"csv:v1:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          "played_on":"2026-08-06",
          "location":"Reading",
          "venue_name":"Example Escapes",
          "venue_slug":"example-escapes-reading-a1b2c3d",
          "room_name":"Another Room",
          "room_slug":"another-room-b1c2d3e",
          "allotted_minutes":60,
          "escaped":true,
          "completion_seconds":3000,
          "players":2,
          "public_note":"This row must roll back"
        },
        {
          "source_ref":"csv:v1:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          "played_on":"2026-08-07",
          "location":"Reading",
          "venue_name":"Example Escapes",
          "venue_slug":"example-escapes-reading-a1b2c3d",
          "room_name":"Broken Room",
          "room_slug":"broken-room-c1d2e3f",
          "allotted_minutes":60,
          "escaped":false,
          "completion_seconds":3200,
          "players":0,
          "public_note":"Invalid player count"
        }
      ]'::jsonb
    );
    raise exception 'invalid batch unexpectedly succeeded';
  exception
    when check_violation then null;
  end;

  if (select count(*) from public.visits) <> v_visits_before then
    raise exception 'invalid batch left a partial visit behind';
  end if;

  if exists (select 1 from public.rooms where name in ('Another Room', 'Broken Room')) then
    raise exception 'invalid batch left partial room records behind';
  end if;
end;
$$;
