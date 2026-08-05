# Escape Atlas SaaS foundation

This branch establishes the contract between the existing static atlas and the
multi-user product.

## What is implemented

- `supabase/migrations/20260805073700_multi_user_foundation.sql` defines the
  first PostgreSQL/Supabase schema: profiles, venues, rooms, visits, reviews and
  private visit notes.
- Row-level security makes a public profile readable while keeping owner-only
  notes in a separate table. That separation prevents a public visit query from
  accidentally returning private notes.
- `/u/anthony-and-trenna/` is the first public-profile contract. It is generated
  from the current 164-room canonical dataset and proves the stats, activity,
  recent-history and identity presentation before authentication is connected.

## Data mapping

| Current JSON | Supabase |
| --- | --- |
| `location` + `venue` | `venues` |
| `game` + `allottedMinutes` | `rooms` |
| `date`, time, players, public note and photo | `visits` |
| private source notes | `visit_private_notes` |
| future ratings and written reviews | `reviews` |

`source_ref` on `visits` provides an idempotency key for CSV imports. The
existing room number can become `legacy:1`, `legacy:2`, and so on during the
one-time migration.

## Next slice

1. Provision the Supabase project and apply the migration.
2. Add passwordless authentication.
3. Connect the completed dry-run CSV importer to authenticated users.
4. Import Anthony and Trenna's canonical history as the first profile.

The static JSON remains authoritative until the import has been reconciled and
the profile output matches the current site.

## CSV preflight

`/import/` now accepts a CSV entirely in the browser, maps common spreadsheet
headers, normalizes UK and ISO dates, parses escape times and outcomes, applies
explicit defaults, detects possible duplicate visits, and attaches every error
to its original source row. Valid rows can be downloaded in the canonical
column order; no database write occurs yet.
