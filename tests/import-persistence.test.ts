import assert from 'node:assert/strict';
import test from 'node:test';
import { previewEscapeAtlasCsv } from '../src/lib/csv-import';
import { buildPersistedImportRows, stableImportSlug } from '../src/lib/import-persistence';

const header = 'date,location,venue,game,completion_time,players,allotted_minutes,escaped,public_note';

test('builds an RPC payload from valid rows only', async () => {
  const preview = previewEscapeAtlasCsv([
    header,
    '2026-08-05,Reading,Example Escapes,The Example Room,48:30,2,60,true,Good row',
    'not-a-date,Reading,Example Escapes,Broken Room,45,2,60,true,Bad row',
  ].join('\n'));

  const payload = await buildPersistedImportRows(preview);

  assert.equal(payload.length, 1);
  assert.deepEqual(payload[0], {
    source_ref: payload[0].source_ref,
    played_on: '2026-08-05',
    location: 'Reading',
    venue_name: 'Example Escapes',
    venue_slug: stableImportSlug('Example Escapes|Reading', 'venue'),
    room_name: 'The Example Room',
    room_slug: stableImportSlug('The Example Room', 'room'),
    allotted_minutes: 60,
    escaped: true,
    completion_seconds: 2910,
    players: 2,
    public_note: 'Good row',
  });
  assert.match(payload[0].source_ref, /^csv:v1:[0-9a-f]{64}$/);
});

test('generates stable, collision-resistant slugs for imported entities', () => {
  const first = stableImportSlug('Café Escape|Montréal', 'venue');
  const repeat = stableImportSlug('Café Escape|Montréal', 'venue');
  const other = stableImportSlug('Cafe Escape|Montreal', 'venue');

  assert.equal(first, repeat);
  assert.match(first, /^cafe-escape-montreal-[a-z0-9]{7}$/);
  assert.notEqual(first, other);
  assert.match(stableImportSlug('密室逃脱', 'venue'), /^venue-[a-z0-9]{7}$/);
});

test('uses the normalized row as an idempotency key', async () => {
  const preview = previewEscapeAtlasCsv([
    header,
    '2026-08-05,Reading,Example Escapes,The Example Room,48:30,2,60,true,Good row',
    '2026-08-05,Reading,Example Escapes,The Example Room,48:30,2,60,true,Good row',
  ].join('\n'));

  const payload = await buildPersistedImportRows(preview);
  assert.equal(payload[0].source_ref, payload[1].source_ref);
});
