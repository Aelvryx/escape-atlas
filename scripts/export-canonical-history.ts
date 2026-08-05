import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import history from '../src/data/rooms.json';
import { buildCanonicalHistoryExport } from '../src/lib/canonical-history';
import type { Room } from '../src/lib/rooms';

const check = process.argv.includes('--check');
const outputDirectory = new URL('../migration/', import.meta.url);
const csvUrl = new URL('canonical-history.csv', outputDirectory);
const sqlUrl = new URL('canonical-history.sql', outputDirectory);
const manifestUrl = new URL('canonical-history.manifest.json', outputDirectory);

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

const rooms = history.rooms as Room[];
const exported = await buildCanonicalHistoryExport(rooms);
const payloadJson = JSON.stringify(exported.payload);
const sql = [
  '-- Generated from src/data/rooms.json by npm run migration:canonical. Do not edit by hand.',
  'select public.import_visits(',
  '  $escape_atlas$',
  JSON.stringify(exported.payload, null, 2),
  '  $escape_atlas$::jsonb',
  ');',
  '',
].join('\n');

const sourceBytes = await readFile(new URL('../src/data/rooms.json', import.meta.url));
const venueRefs = new Set(exported.payload.map((row) => row.venue_slug));
const roomRefs = new Set(exported.payload.map((row) => `${row.venue_slug}|${row.room_slug}`));
const manifest = {
  schemaVersion: 1,
  source: {
    ...history.source,
    sha256: sha256(sourceBytes),
  },
  expected: {
    visits: rooms.length,
    venues: venueRefs.size,
    rooms: roomRefs.size,
    timedVisits: exported.payload.filter((row) => row.completion_seconds !== null).length,
    publicNotes: exported.payload.filter((row) => row.public_note !== null).length,
    unknownOutcomes: exported.payload.filter((row) => row.escaped === null).length,
    uniqueSourceRefs: new Set(exported.payload.map((row) => row.source_ref)).size,
    firstPlayedOn: exported.payload[0]?.played_on ?? null,
    lastPlayedOn: exported.payload.at(-1)?.played_on ?? null,
  },
  substitutions: exported.substitutions,
  artifacts: {
    csvSha256: sha256(exported.csv),
    payloadSha256: sha256(payloadJson),
    sqlSha256: sha256(sql),
  },
  rows: rooms.map((room, index) => ({
    sourceId: room.id,
    sourceRef: exported.payload[index].source_ref,
    venueSlug: exported.payload[index].venue_slug,
    roomSlug: exported.payload[index].room_slug,
  })),
};
const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;

const artifacts = [
  [csvUrl, exported.csv],
  [sqlUrl, sql],
  [manifestUrl, manifestJson],
] as const;

if (check) {
  for (const [url, expected] of artifacts) {
    const actual = await readFile(url, 'utf8').catch(() => null);
    if (actual !== expected) {
      throw new Error(`${url.pathname.split('/').at(-1)} is stale. Run npm run migration:canonical.`);
    }
  }
  console.log(`Verified canonical migration artifacts for ${rooms.length} rooms.`);
} else {
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(artifacts.map(([url, contents]) => writeFile(url, contents, 'utf8')));
  console.log(`Exported ${rooms.length} canonical rooms with ${exported.substitutions.length} explicit substitutions.`);
}
