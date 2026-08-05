import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import history from '../src/data/rooms.json';
import { buildCanonicalHistoryExport } from '../src/lib/canonical-history';
import type { Room } from '../src/lib/rooms';

const check = process.argv.includes('--check');
const outputDirectory = new URL('../migration/', import.meta.url);
const csvUrl = new URL('canonical-history.csv', outputDirectory);
const manifestUrl = new URL('canonical-history.manifest.json', outputDirectory);

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

const rooms = history.rooms as Room[];
const exported = await buildCanonicalHistoryExport(rooms);

const sourceBytes = await readFile(new URL('../src/data/rooms.json', import.meta.url));
const normalizedRows = exported.preview.rows.map((row) => row.normalized);
const venueRefs = new Set(normalizedRows.map((row) => `${row.location}|${row.venue}`));
const roomRefs = new Set(normalizedRows.map((row) => `${row.location}|${row.venue}|${row.game}`));
const manifest = {
  schemaVersion: 1,
  source: {
    ...history.source,
    sha256: sha256(sourceBytes),
  },
  expected: {
    records: rooms.length,
    venueLocations: venueRefs.size,
    roomIdentities: roomRefs.size,
    timedRecords: normalizedRows.filter((row) => row.completion_seconds !== null).length,
    publicNotes: normalizedRows.filter((row) => row.public_note).length,
    unknownOutcomes: normalizedRows.filter((row) => row.escaped === null).length,
    firstPlayedOn: normalizedRows[0]?.date ?? null,
    lastPlayedOn: normalizedRows.at(-1)?.date ?? null,
  },
  substitutions: exported.substitutions,
  artifacts: {
    csvSha256: sha256(exported.csv),
  },
  rows: rooms.map((room, index) => ({
    sourceId: room.id,
    location: normalizedRows[index].location,
    venue: normalizedRows[index].venue,
    game: normalizedRows[index].game,
  })),
};
const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;

const artifacts = [
  [csvUrl, exported.csv],
  [manifestUrl, manifestJson],
] as const;

if (check) {
  for (const [url, expected] of artifacts) {
    const actual = await readFile(url, 'utf8').catch(() => null);
    if (actual !== expected) {
      throw new Error(`${url.pathname.split('/').at(-1)} is stale. Run npm run history:export.`);
    }
  }
    console.log(`Verified canonical history export for ${rooms.length} rooms.`);
} else {
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(artifacts.map(([url, contents]) => writeFile(url, contents, 'utf8')));
  console.log(`Exported ${rooms.length} canonical rooms with ${exported.substitutions.length} explicit substitutions.`);
}
