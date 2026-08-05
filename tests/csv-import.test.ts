import assert from 'node:assert/strict';
import test from 'node:test';
import { exportValidRowsCsv, previewEscapeAtlasCsv } from '../src/lib/csv-import';

const canonicalHeader = 'date,location,venue,game,completion_time,players,allotted_minutes,escaped,public_note';

test('normalizes UK dates, header aliases, outcomes, and quoted notes', () => {
  const preview = previewEscapeAtlasCsv([
    'Played Date,Town,Operator,Room,Time,Team Size,Duration,Won,Notes',
    '5/8/2026,Reading,Example Escapes,The Example Room,48:30,2,60,yes,"Clever, warm and fair"',
  ].join('\n'));

  assert.equal(preview.validRows, 1);
  assert.equal(preview.invalidRows, 0);
  assert.equal(preview.errors, 0);
  assert.deepEqual(preview.rows[0].normalized, {
    date: '2026-08-05',
    location: 'Reading',
    venue: 'Example Escapes',
    game: 'The Example Room',
    completion_time: '00:48:30',
    completion_seconds: 2910,
    players: 2,
    allotted_minutes: 60,
    escaped: true,
    public_note: 'Clever, warm and fair',
  });
});

test('reports missing required headers before parsing rows', () => {
  const preview = previewEscapeAtlasCsv('date,location\n2026-08-05,Reading');

  assert.equal(preview.validRows, 0);
  assert.equal(preview.invalidRows, 1);
  assert.deepEqual(preview.missingHeaders, ['venue', 'game']);
  assert.equal(preview.issues.filter((issue) => issue.code === 'missing_header').length, 2);
});

test('keeps row-level validation errors actionable', () => {
  const preview = previewEscapeAtlasCsv([
    canonicalHeader,
    '31/02/2026,Reading,Example Escapes,The Example Room,48:99,zero,0,perhaps,',
  ].join('\n'));

  assert.equal(preview.validRows, 0);
  assert.equal(preview.invalidRows, 1);
  assert.deepEqual(
    preview.rows[0].issues.map((issue) => issue.code),
    ['invalid_date', 'invalid_completion_time', 'invalid_players', 'invalid_allotted_minutes', 'invalid_outcome'],
  );
});

test('blocks malformed CSV rows from the clean export', () => {
  const preview = previewEscapeAtlasCsv([
    canonicalHeader,
    '2026-08-05,Reading,Example Escapes,"Unterminated room,48:30,2,60,true,',
  ].join('\n'));

  assert.equal(preview.parseErrors, 1);
  assert.equal(preview.validRows, 0);
  assert.equal(preview.invalidRows, 1);
  assert.equal(preview.rows[0].valid, false);
  assert.equal(preview.rows[0].issues[0].code, 'csv_missingquotes');
  assert.throws(() => exportValidRowsCsv(preview), /Fix CSV parsing errors/);
});

test('uses explicit warnings for defaults and over-time finishes', () => {
  const preview = previewEscapeAtlasCsv([
    canonicalHeader,
    '2026-08-05,Reading,Example Escapes,The Example Room,69:17,,,,',
  ].join('\n'));

  assert.equal(preview.validRows, 1);
  assert.equal(preview.errors, 0);
  assert.deepEqual(
    preview.rows[0].issues.map((issue) => issue.code),
    ['default_players', 'default_allotted_minutes', 'over_allotted_time'],
  );
});

test('flags possible duplicate visits without discarding either row', () => {
  const preview = previewEscapeAtlasCsv([
    canonicalHeader,
    '2026-08-05,Reading,Example Escapes,The Example Room,48:30,2,60,true,First copy',
    '2026-08-05,Reading,Example Escapes,The Example Room,49:00,2,60,true,Second copy',
  ].join('\n'));

  assert.equal(preview.validRows, 2);
  assert.equal(preview.warnings, 1);
  assert.equal(preview.rows[1].issues[0].code, 'possible_duplicate');
});

test('exports only valid rows in the canonical column order', () => {
  const preview = previewEscapeAtlasCsv([
    canonicalHeader,
    '2026-08-05,Reading,Example Escapes,The Example Room,48.5,2,60,true,Good row',
    'not-a-date,Reading,Example Escapes,Broken Row,45,2,60,true,Bad row',
  ].join('\n'));

  const exported = exportValidRowsCsv(preview);
  const reparsed = previewEscapeAtlasCsv(exported);

  assert.equal(reparsed.totalRows, 1);
  assert.equal(reparsed.validRows, 1);
  assert.equal(reparsed.rows[0].normalized.completion_seconds, 2910);
});
