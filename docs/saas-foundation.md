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
- `/venues/` is the first discovery surface. It groups 162 named-room records
  into 82 normalized operator histories, supports operator/location/game search,
  and generates a durable page for every known operator.

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

1. Provision the Supabase project and apply both migrations.
2. Add the project URL and publishable key to Cloudflare Pages.
3. Exercise passwordless authentication and the completed account-backed importer against the provisioned project.
4. Import Anthony and Trenna's canonical history as the first profile.

The static JSON remains authoritative until the import has been reconciled and
the profile output matches the current site.

## Static discovery

Venue discovery deliberately groups harmless source casing drift such as
`Co-Decode`/`Co-decode` and `Knock out escape rooms`/`Knock Out Escape Rooms`
into one public operator page. The two visits whose source venue is genuinely
unknown remain visible in room history but do not invent public operator pages.

Every known room links back to its operator history. Multi-location operators
show the location breakdown, repeat visits, recorded-time coverage and the
complete room trail; location pills return to a shareable filtered directory.

## CSV preflight

`/import/` accepts a CSV entirely in the browser, maps common spreadsheet
headers, normalizes UK and ISO dates, parses escape times and outcomes, applies
explicit defaults, detects possible duplicate visits, and attaches every error
to its original source row. Valid rows can be downloaded in the canonical
column order. When public Supabase configuration is present, the same page
offers passwordless email sign-in and sends valid rows to `import_visits`.

The RPC derives ownership from `auth.uid()`, creates or updates venues and
rooms, and upserts visits by a stable CSV fingerprint. The complete batch runs
inside one PostgreSQL transaction: either every valid row is saved or none is.

## Canonical history reconciliation

`npm run migration:canonical` turns the authoritative 164-room JSON history
into a validated CSV, the exact normalized RPC payload, and a reconciliation
manifest. The manifest records source/artifact hashes, every stable import
fingerprint, all ten explicit placeholders for missing legacy names, and the
expected database shape: 164 visits, 95 venue/location identities, 164 room
identities, 157 timed visits, five public notes and no invented outcomes.

`npm run migration:verify` is part of the normal check pipeline. CI also sends
the full 164-row payload through `import_visits` twice against PostgreSQL 17 and
asserts the exact expected counts, date range and idempotency.

## Environment

Copy `.env.example` and provide:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy `PUBLIC_SUPABASE_ANON_KEY` is also accepted)

These values identify the public Supabase project; authorization remains in
the user's passwordless session and database policies.
