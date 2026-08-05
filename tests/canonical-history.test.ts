import assert from 'node:assert/strict';
import test from 'node:test';
import history from '../src/data/rooms.json';
import { buildCanonicalHistoryExport, canonicalHistoryRow } from '../src/lib/canonical-history';
import type { Room } from '../src/lib/rooms';

const rooms = history.rooms as Room[];

test('adapts every canonical room without inventing a result', async () => {
  const exported = await buildCanonicalHistoryExport(rooms);

  assert.equal(exported.preview.totalRows, 164);
  assert.equal(exported.preview.validRows, 164);
  assert.equal(exported.preview.errors, 0);
  assert.equal(exported.preview.rows.filter((row) => row.normalized.escaped === null).length, 164);
  assert.equal(exported.preview.rows.filter((row) => row.normalized.completion_seconds !== null).length, 157);
  assert.equal(exported.preview.rows.filter((row) => row.normalized.public_note).length, 5);
});

test('makes all ten missing identity fields explicit and traceable', async () => {
  const exported = await buildCanonicalHistoryExport(rooms);

  assert.equal(exported.substitutions.length, 10);
  assert.deepEqual(
    exported.substitutions.filter((entry) => entry.field === 'venue').map((entry) => entry.sourceId),
    [95, 117],
  );
  assert.deepEqual(
    exported.substitutions.filter((entry) => entry.field === 'game').map((entry) => entry.sourceId),
    [1, 2, 3, 4, 5, 6, 54, 55],
  );
  assert.equal(canonicalHistoryRow(rooms[0]).game, 'Historic room #001 — name unknown');
  assert.equal(canonicalHistoryRow(rooms[94]).venue, 'Unknown venue · Newport');
});

test('preserves duplicate legacy visits as distinct export rows', async () => {
  const exported = await buildCanonicalHistoryExport(rooms);

  assert.equal(exported.preview.rows.length, 164);
  assert.equal(exported.preview.rows[53].normalized.game, 'Historic room #054 — name unknown');
  assert.equal(exported.preview.rows[54].normalized.game, 'Historic room #055 — name unknown');
  assert.notEqual(exported.preview.rows[53].normalized.game, exported.preview.rows[54].normalized.game);
});

test('exports public notes but excludes private source notes and photo metadata', async () => {
  const exported = await buildCanonicalHistoryExport(rooms);

  assert.match(exported.csv, /Escaped with Jules\./);
  assert.doesNotMatch(exported.csv, /Result card showed 19:31 remaining/);
  assert.doesNotMatch(exported.csv, /email-photo-confirmed/);
  assert.doesNotMatch(exported.csv, /images\/rooms/);
});
