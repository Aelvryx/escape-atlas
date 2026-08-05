# Escape Atlas

A living public history of Anthony and Trenna's escape-room adventures, maintained by Mei.

Target: [atlas.mei.place](https://atlas.mei.place)

## What It Contains

- A validated canonical history of 164 completed rooms from 2015–2026.
- A searchable and filterable history.
- Individual room pages that preserve unknown source fields honestly.
- A searchable operator directory with generated venue histories and location trails.
- A location atlas with 56 generated place histories and a shareable four-stop route board.
- Evidence-safe statistics and frequency summaries.
- A public-safe upcoming-room snapshot derived from Mei's authoritative Fastmail calendar.

The archived workbook is source evidence, not a second live database. `src/data/rooms.json` becomes canonical after migration.

## Commands

```bash
npm install
npm run dev
npm run validate
npm run check
```

### Re-run the initial history import

```bash
npm run import:history -- \
  --source /path/to/memory/reference/escape-rooms.md \
  --workbook /path/to/trenna-escape-rooms-2026-07-11.xlsx \
  --output src/data/rooms.json
```

### Generate the upcoming snapshot

Fastmail remains authoritative. Calendar events intended for the public site use this summary convention:

```text
Escape room — <game> @ <venue>
```

The event's `LOCATION` becomes the public location. The generator reads bounded calendar data through the local Fastmail helper, then writes only the safe fields in `src/data/upcoming.json`:

```bash
npm run generate:upcoming -- \
  --start 2026-07-11T00:00:00+01:00 \
  --end 2027-01-01T00:00:00+00:00
```

Raw ICS, attendee addresses, descriptions, booking references, payment details and QR material are never written to the repository.

## Data Quality

`npm run validate` enforces:

- non-empty, sequential unique completed-room IDs and a matching source count;
- ISO dates and recorded-time consistency;
- a positive player count and game length for every room;
- explicit source flags for source-level duplicate core fields;
- required public fields for upcoming rooms; and
- forbidden operational fields staying out of the public snapshot.

Rows #54 and #55 are intentionally both retained: the source records two different Staines games but omits both game names, leaving their visible core fields identical.

Anthony confirmed that an unrecorded player count means the room was played by Anthony and Trenna, so those records use `2`. Unrecorded game lengths use an explicit `60`-minute assumption. Any recorded exceptions are preserved.

The 159-room workbook import is immutable migration evidence. New rooms are appended to the canonical JSON through the [message-to-live workflow](docs/message-to-live.md); the spreadsheet does not need parallel maintenance.

## Deployment

Every push runs validation, type checks and a production build in GitHub Actions. The production Cloudflare Pages project, `escape-atlas`, is connected directly to the repository and automatically deploys `main` to [atlas.mei.place](https://atlas.mei.place).

The explicit Wrangler workflow remains disabled behind `CLOUDFLARE_READY=false`; it is a recovery path, not the normal deployment route.

## SaaS foundation

The first multi-user product slice lives in two places:

- [`supabase/migrations/20260805073700_multi_user_foundation.sql`](supabase/migrations/20260805073700_multi_user_foundation.sql) defines the Supabase schema and row-level access rules.
- [`supabase/migrations/20260805094000_authenticated_csv_import.sql`](supabase/migrations/20260805094000_authenticated_csv_import.sql) adds the atomic authenticated CSV import RPC.
- Copy [`.env.example`](.env.example) to connect passwordless Supabase auth and account-backed imports.
- [`migration/`](migration/) contains the deterministic 164-room CSV, atomic RPC payload and reconciliation manifest; regenerate with `npm run migration:canonical`.
- [`/u/anthony-and-trenna/`](https://atlas.mei.place/u/anthony-and-trenna/) is the public-profile prototype backed by the canonical history.

See [`docs/saas-foundation.md`](docs/saas-foundation.md) for the data mapping and next build slice.
