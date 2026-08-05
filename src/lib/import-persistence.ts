import type { ImportPreview, NormalizedImportRow } from './csv-import';

export interface PersistedImportRow {
  source_ref: string;
  played_on: string;
  location: string;
  venue_name: string;
  venue_slug: string;
  room_name: string;
  room_slug: string;
  allotted_minutes: number;
  escaped: boolean | null;
  completion_seconds: number | null;
  players: number;
  public_note: string | null;
}

function shortHash(value: string): string {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

export function stableImportSlug(value: string, fallback: string): string {
  const base = value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
    .replace(/-+$/g, '');

  return `${base || fallback}-${shortHash(value)}`;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function canonicalFingerprint(row: NormalizedImportRow): string {
  return JSON.stringify([
    row.date,
    row.location,
    row.venue,
    row.game,
    row.completion_seconds,
    row.players,
    row.allotted_minutes,
    row.escaped,
    row.public_note,
  ]);
}

export async function buildPersistedImportRows(preview: ImportPreview): Promise<PersistedImportRow[]> {
  return Promise.all(preview.rows.filter((row) => row.valid).map(async ({ normalized }) => ({
    source_ref: `csv:v1:${await sha256(canonicalFingerprint(normalized))}`,
    played_on: normalized.date,
    location: normalized.location,
    venue_name: normalized.venue,
    venue_slug: stableImportSlug(`${normalized.venue}|${normalized.location}`, 'venue'),
    room_name: normalized.game,
    room_slug: stableImportSlug(normalized.game, 'room'),
    allotted_minutes: normalized.allotted_minutes,
    escaped: normalized.escaped,
    completion_seconds: normalized.completion_seconds,
    players: normalized.players,
    public_note: normalized.public_note || null,
  })));
}
