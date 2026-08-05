# Canonical history export

These artifacts are generated from `src/data/rooms.json`, which remains the
authoritative Escape Atlas history.

Run:

```sh
npm run history:export
```

This deterministically produces:

- `canonical-history.csv` — the same 164 rows accepted by the browser preflight;
- `canonical-history.manifest.json` — source and artifact checksums, expected
  record counts, explicit legacy substitutions and the source-ID mapping.

`npm run history:verify` regenerates the data in memory and fails if any
committed artifact has drifted.

## Lossless legacy handling

The source has eight visits whose room name was never recorded and two whose
venue was never recorded. The migration does not discard or silently merge
them. It gives each missing room an explicit source-ID-labelled placeholder and
each missing venue a location-labelled placeholder. All ten substitutions are
listed in the manifest.

Escape outcomes were not present in the historical source, so all 164 remain
unknown rather than being guessed. Only the five explicitly public notes are
exported; source notes, flags, photos and photo metadata are excluded.
