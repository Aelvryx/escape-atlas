import Papa from 'papaparse';
import type { Room } from './rooms';
import {
  canonicalImportHeaders,
  previewEscapeAtlasCsv,
  type ImportPreview,
  type NormalizedImportRow,
} from './csv-import';

export interface CanonicalHistorySubstitution {
  sourceId: number;
  field: 'venue' | 'game';
  value: string;
}

export interface CanonicalHistoryExport {
  csv: string;
  preview: ImportPreview;
  substitutions: CanonicalHistorySubstitution[];
}

function historicRoomName(room: Room): string {
  return `Historic room #${String(room.id).padStart(3, '0')} — name unknown`;
}

function historicVenueName(room: Room): string {
  return `Unknown venue · ${room.location}`;
}

export function canonicalHistoryRow(room: Room): NormalizedImportRow {
  return {
    date: room.date,
    location: room.location,
    venue: room.venue ?? historicVenueName(room),
    game: room.game ?? historicRoomName(room),
    completion_time: room.completionTime ?? '',
    completion_seconds: room.completionSeconds,
    players: room.players,
    allotted_minutes: room.allottedMinutes,
    escaped: null,
    public_note: room.publicNote ?? '',
  };
}

export function canonicalHistorySubstitutions(rooms: Room[]): CanonicalHistorySubstitution[] {
  return rooms.flatMap((room) => {
    const substitutions: CanonicalHistorySubstitution[] = [];
    if (!room.venue) substitutions.push({ sourceId: room.id, field: 'venue', value: historicVenueName(room) });
    if (!room.game) substitutions.push({ sourceId: room.id, field: 'game', value: historicRoomName(room) });
    return substitutions;
  });
}

function exportRowsCsv(rows: NormalizedImportRow[]): string {
  return Papa.unparse(rows.map((row) => ({
    date: row.date,
    location: row.location,
    venue: row.venue,
    game: row.game,
    completion_time: row.completion_time,
    players: row.players,
    allotted_minutes: row.allotted_minutes,
    escaped: '',
    public_note: row.public_note,
  })), { columns: [...canonicalImportHeaders] });
}

export async function buildCanonicalHistoryExport(rooms: Room[]): Promise<CanonicalHistoryExport> {
  const csv = exportRowsCsv(rooms.map(canonicalHistoryRow));
  const preview = previewEscapeAtlasCsv(csv);

  if (preview.validRows !== rooms.length || preview.invalidRows !== 0 || preview.errors !== 0) {
    throw new Error(
      `Canonical history failed import preflight: ${preview.validRows}/${rooms.length} valid, ${preview.errors} errors.`,
    );
  }

  return {
    csv,
    preview,
    substitutions: canonicalHistorySubstitutions(rooms),
  };
}
