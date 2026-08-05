# Canonical history migration

These artifacts are generated from `src/data/rooms.json`, which remains the
authoritative Escape Atlas history until a live Supabase import is reconciled.

Run:

```sh
npm run migration:canonical
```

This deterministically produces:

- `canonical-history.csv` — the same 164 rows accepted by the browser preflight;
- `canonical-history.sql` — the normalized JSON payload passed to the atomic
  authenticated `import_visits` RPC;
- `canonical-history.manifest.json` — source and artifact checksums, expected
  database counts, explicit legacy substitutions, and the source-ID-to-import
  fingerprint map.

`npm run migration:verify` regenerates the data in memory and fails if any
committed artifact has drifted. The full SQL payload is also imported twice in
CI against PostgreSQL 17, proving both exact reconciliation counts and
idempotency.

## Lossless legacy handling

The source has eight visits whose room name was never recorded and two whose
venue was never recorded. The migration does not discard or silently merge
them. It gives each missing room an explicit source-ID-labelled placeholder and
each missing venue a location-labelled placeholder. All ten substitutions are
listed in the manifest.

Escape outcomes were not present in the historical source, so all 164 remain
unknown rather than being guessed. Only the five explicitly public notes are
exported; source notes, flags, photos and photo metadata are excluded.
