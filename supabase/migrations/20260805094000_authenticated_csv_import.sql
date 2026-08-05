begin;

create or replace function public.import_visits(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_row jsonb;
  v_venue_id uuid;
  v_room_id uuid;
  v_visit_id uuid;
  v_processed integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Import payload must be a JSON array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_rows) > 1000 then
    raise exception 'Import batches are limited to 1,000 rows' using errcode = '54000';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    if coalesce(v_row ->> 'source_ref', '') !~ '^csv:v1:[0-9a-f]{64}$' then
      raise exception 'Every import row needs a valid source_ref' using errcode = '22023';
    end if;

    if coalesce(v_row ->> 'location', '') = ''
      or coalesce(v_row ->> 'venue_name', '') = ''
      or coalesce(v_row ->> 'venue_slug', '') = ''
      or coalesce(v_row ->> 'room_name', '') = ''
      or coalesce(v_row ->> 'room_slug', '') = ''
      or coalesce(v_row ->> 'played_on', '') = '' then
      raise exception 'Every import row needs a date, location, venue and room' using errcode = '22023';
    end if;

    insert into public.venues (created_by, slug, name, location)
    values (
      v_user_id,
      v_row ->> 'venue_slug',
      v_row ->> 'venue_name',
      v_row ->> 'location'
    )
    on conflict (created_by, slug) do update
      set name = excluded.name,
          location = excluded.location
    returning id into v_venue_id;

    insert into public.rooms (venue_id, created_by, slug, name, allotted_minutes)
    values (
      v_venue_id,
      v_user_id,
      v_row ->> 'room_slug',
      v_row ->> 'room_name',
      nullif(v_row ->> 'allotted_minutes', '')::integer
    )
    on conflict (venue_id, slug) do update
      set name = excluded.name,
          allotted_minutes = excluded.allotted_minutes
    returning id into v_room_id;

    insert into public.visits (
      profile_id,
      room_id,
      played_on,
      escaped,
      completion_seconds,
      players,
      public_note,
      source_ref
    )
    values (
      v_user_id,
      v_room_id,
      (v_row ->> 'played_on')::date,
      nullif(v_row ->> 'escaped', '')::boolean,
      nullif(v_row ->> 'completion_seconds', '')::integer,
      (v_row ->> 'players')::integer,
      nullif(v_row ->> 'public_note', ''),
      v_row ->> 'source_ref'
    )
    on conflict (profile_id, source_ref) where source_ref is not null do update
      set room_id = excluded.room_id,
          played_on = excluded.played_on,
          escaped = excluded.escaped,
          completion_seconds = excluded.completion_seconds,
          players = excluded.players,
          public_note = excluded.public_note
    returning id into v_visit_id;

    v_processed := v_processed + 1;
  end loop;

  return jsonb_build_object(
    'processed', v_processed,
    'profile_id', v_user_id
  );
end;
$$;

revoke all on function public.import_visits(jsonb) from public;
revoke all on function public.import_visits(jsonb) from anon;
grant execute on function public.import_visits(jsonb) to authenticated;

comment on function public.import_visits(jsonb) is
  'Atomically upserts one authenticated user''s normalized CSV rows into venues, rooms and visits.';

commit;
