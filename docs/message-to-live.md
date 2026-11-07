# Message-to-live updates

Anthony or Trenna can send Mei the result after a room. The Atlas repository is the only live history; the migration workbook remains evidence and is not maintained in parallel.

## Minimum input

- Game name.
- Completion date.
- Location and venue, either stated in the message or verified from the existing booking evidence.
- Completion time, or an explicit statement that no time was recorded.

Player count, game length, notes and a finish photo are optional. When the player count is omitted, use `2` for Anthony and Trenna. When the game length is omitted, use the agreed `60`-minute assumption. Explicitly supplied exceptions always win; other genuinely unknown fields stay `null`.

## Publication pass

1. Reconcile the message against existing calendar, itinerary or venue evidence.
2. Confirm the next sequential ID and check for a duplicate date/location/venue/game record.
3. Append the room to `src/data/rooms.json` and update `source.recordCount` and `source.updated`.
4. If a supplied photo is intended for the public Atlas, store it under `public/images/rooms/` and add accessible alt text. Never publish booking references, QR codes, email addresses, phone numbers, payment details or raw calendar data.
5. Remove the exact matching completed entry from `src/data/upcoming.json`, if present, and refresh its `generatedAt` timestamp. Do not rescan Fastmail unless a new booking also needs publishing.
6. Regenerate `npm run history:export` and `npm run social:generate` after adding rooms. Run `npm run validate` and `git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check` (the canonical CSV uses CRLF).
7. Commit and push only the bounded Atlas change on a feature branch. Open a PR, satisfy required checks, and merge through the protected-branch workflow; never push directly to `main`. Report the predicted room link as deploying only once merged.
8. Stop. Do not duplicate the release into Asana or daily memory.

## CI and deployment ownership

Routine history updates do not need a local Astro build, browser screenshots, GitHub Actions watching, Cloudflare polling or live-site readback. GitHub Actions already runs the full Astro check/build and dependency audit on every push; Cloudflare Pages deploys from the Git repository. A GitHub failure email is the asynchronous exception path handled by inbox triage.

Run the full verification chain only when changing the schema, validator, components, styling, routing, CI/deployment, when a failure notification arrives, or when Anthony explicitly requests release verification.

## Corrections and rollback

For a factual correction, edit the same room record, run the bounded validation, commit and push. Do not add a second room to compensate for a typo.

For an unsafe or materially wrong publication, revert the offending commit, push the revert, and verify that Cloudflare serves the previous version. Preserve the original message or photo privately as evidence; do not rewrite Git history.

## First live proof

Room #160, Outatime at Escapable in Wakefield, was received by message on 11 July 2026 with a finish photo showing 37:18. The room record and photo are the first real message-to-live update after the initial 159-room migration.
