import Papa from 'papaparse';

export const canonicalImportHeaders = [
  'date',
  'location',
  'venue',
  'game',
  'completion_time',
  'players',
  'allotted_minutes',
  'escaped',
  'public_note',
] as const;

export type CanonicalImportHeader = (typeof canonicalImportHeaders)[number];
export type ImportIssueSeverity = 'error' | 'warning';

export interface ImportIssue {
  severity: ImportIssueSeverity;
  code: string;
  message: string;
  row?: number;
  field?: CanonicalImportHeader;
}

export interface NormalizedImportRow {
  date: string;
  location: string;
  venue: string;
  game: string;
  completion_time: string;
  completion_seconds: number | null;
  players: number;
  allotted_minutes: number;
  escaped: boolean | null;
  public_note: string;
}

export interface ImportRowPreview {
  sourceRow: number;
  valid: boolean;
  normalized: NormalizedImportRow;
  issues: ImportIssue[];
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: number;
  parseErrors: number;
  warnings: number;
  recognizedHeaders: CanonicalImportHeader[];
  ignoredHeaders: string[];
  missingHeaders: CanonicalImportHeader[];
  rows: ImportRowPreview[];
  issues: ImportIssue[];
}

const requiredHeaders: CanonicalImportHeader[] = ['date', 'location', 'venue', 'game'];

const headerAliases: Record<string, CanonicalImportHeader> = {
  date: 'date',
  played: 'date',
  played_date: 'date',
  played_on: 'date',
  visit_date: 'date',
  location: 'location',
  town: 'location',
  city: 'location',
  place: 'location',
  venue: 'venue',
  operator: 'venue',
  company: 'venue',
  game: 'game',
  room: 'game',
  room_name: 'game',
  game_name: 'game',
  completion_time: 'completion_time',
  finish_time: 'completion_time',
  time: 'completion_time',
  time_taken: 'completion_time',
  players: 'players',
  team_size: 'players',
  party_size: 'players',
  allotted_minutes: 'allotted_minutes',
  duration: 'allotted_minutes',
  game_length: 'allotted_minutes',
  time_limit: 'allotted_minutes',
  escaped: 'escaped',
  won: 'escaped',
  success: 'escaped',
  outcome: 'escaped',
  public_note: 'public_note',
  note: 'public_note',
  notes: 'public_note',
  review: 'public_note',
};

function normalizeHeader(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isValidDate(year: number, month: number, day: number): boolean {
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
}

function parseDate(value: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) {
    const [, year, month, day] = iso.map(Number);
    if (isValidDate(year, month, day)) return value;
    return null;
  }

  const uk = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(value);
  if (!uk) return null;
  const [, day, month, year] = uk.map(Number);
  if (!isValidDate(year, month, day)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatCompletionTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function parseCompletionTime(value: string): { normalized: string; seconds: number | null } | null {
  if (!value) return { normalized: '', seconds: null };

  if (/^\d+(\.\d+)?$/.test(value)) {
    const totalSeconds = Math.round(Number(value) * 60);
    if (totalSeconds <= 0 || totalSeconds > 12 * 3600) return null;
    return { normalized: formatCompletionTime(totalSeconds), seconds: totalSeconds };
  }

  const parts = value.split(':').map(Number);
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) return null;

  let totalSeconds: number;
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (seconds > 59) return null;
    totalSeconds = minutes * 60 + seconds;
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (minutes > 59 || seconds > 59) return null;
    totalSeconds = hours * 3600 + minutes * 60 + seconds;
  } else {
    return null;
  }

  if (totalSeconds <= 0 || totalSeconds > 12 * 3600) return null;
  return { normalized: formatCompletionTime(totalSeconds), seconds: totalSeconds };
}

function parseInteger(value: string, minimum: number, maximum: number): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) return null;
  return parsed;
}

function parseOutcome(value: string): boolean | null | undefined {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (['true', 'yes', 'y', '1', 'escaped', 'success', 'won', 'win'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0', 'failed', 'failure', 'lost', 'loss'].includes(normalized)) return false;
  return undefined;
}

function emptyNormalizedRow(): NormalizedImportRow {
  return {
    date: '',
    location: '',
    venue: '',
    game: '',
    completion_time: '',
    completion_seconds: null,
    players: 2,
    allotted_minutes: 60,
    escaped: null,
    public_note: '',
  };
}

function summarize(
  totalRows: number,
  rows: ImportRowPreview[],
  issues: ImportIssue[],
  recognizedHeaders: CanonicalImportHeader[],
  ignoredHeaders: string[],
  missingHeaders: CanonicalImportHeader[],
): ImportPreview {
  return {
    totalRows,
    validRows: rows.filter((row) => row.valid).length,
    invalidRows: totalRows - rows.filter((row) => row.valid).length,
    errors: issues.filter((issue) => issue.severity === 'error').length,
    parseErrors: issues.filter((issue) => issue.code.startsWith('csv_')).length,
    warnings: issues.filter((issue) => issue.severity === 'warning').length,
    recognizedHeaders,
    ignoredHeaders,
    missingHeaders,
    rows,
    issues,
  };
}

export function previewEscapeAtlasCsv(csv: string): ImportPreview {
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: 'greedy' });
  const matrix = parsed.data;
  const totalRows = Math.max(matrix.length - 1, 0);
  const parserIssues: ImportIssue[] = parsed.errors.map((error) => ({
    severity: 'error',
    code: `csv_${error.code.toLowerCase()}`,
    message: error.message,
    row: typeof error.row === 'number' ? error.row + 1 : undefined,
  }));
  const issues: ImportIssue[] = [];

  if (matrix.length === 0 || matrix[0].length === 0) {
    issues.push(...parserIssues);
    issues.push({ severity: 'error', code: 'empty_file', message: 'The CSV file is empty.' });
    return summarize(0, [], issues, [], [], requiredHeaders);
  }

  const rawHeaders = matrix[0].map((header) => String(header).trim());
  const mappedHeaders: Array<CanonicalImportHeader | null> = [];
  const recognizedHeaders: CanonicalImportHeader[] = [];
  const ignoredHeaders: string[] = [];
  const duplicateHeaders = new Set<CanonicalImportHeader>();

  for (const rawHeader of rawHeaders) {
    const mapped = headerAliases[normalizeHeader(rawHeader)] ?? null;
    mappedHeaders.push(mapped);
    if (!mapped) {
      ignoredHeaders.push(rawHeader || '(blank column)');
      continue;
    }
    if (recognizedHeaders.includes(mapped)) duplicateHeaders.add(mapped);
    else recognizedHeaders.push(mapped);
  }

  for (const header of ignoredHeaders) {
    issues.push({
      severity: 'warning',
      code: 'ignored_header',
      message: `Column “${header}” is not recognised and will be ignored.`,
    });
  }

  for (const header of duplicateHeaders) {
    issues.push({
      severity: 'error',
      code: 'duplicate_header',
      field: header,
      message: `More than one column maps to “${header}”. Keep only one of them.`,
    });
  }

  const missingHeaders = requiredHeaders.filter((header) => !recognizedHeaders.includes(header));
  for (const header of missingHeaders) {
    issues.push({
      severity: 'error',
      code: 'missing_header',
      field: header,
      message: `Required column “${header}” is missing.`,
    });
  }

  if (missingHeaders.length > 0 || duplicateHeaders.size > 0) {
    issues.unshift(...parserIssues);
    return summarize(totalRows, [], issues, recognizedHeaders, ignoredHeaders, missingHeaders);
  }

  const rowPreviews: ImportRowPreview[] = [];

  for (const [index, values] of matrix.slice(1).entries()) {
    const sourceRow = index + 2;
    const rowIssues: ImportIssue[] = parserIssues.filter((issue) => issue.row === sourceRow);
    const raw = Object.fromEntries(
      canonicalImportHeaders.map((header) => [header, '']),
    ) as Record<CanonicalImportHeader, string>;

    mappedHeaders.forEach((header, columnIndex) => {
      if (header) raw[header] = String(values[columnIndex] ?? '').trim();
    });

    if (values.length > rawHeaders.length && values.slice(rawHeaders.length).some((value) => String(value).trim())) {
      rowIssues.push({
        severity: 'error',
        code: 'extra_columns',
        row: sourceRow,
        message: 'This row has more values than the header. Check for an unquoted comma.',
      });
    }

    const normalized = emptyNormalizedRow();
    for (const field of requiredHeaders) {
      if (!raw[field]) {
        rowIssues.push({
          severity: 'error',
          code: 'required_value',
          row: sourceRow,
          field,
          message: `“${field}” is required.`,
        });
      }
    }

    const normalizedDate = raw.date ? parseDate(raw.date) : null;
    if (raw.date && !normalizedDate) {
      rowIssues.push({
        severity: 'error',
        code: 'invalid_date',
        row: sourceRow,
        field: 'date',
        message: 'Use YYYY-MM-DD or a UK date such as DD/MM/YYYY.',
      });
    }
    normalized.date = normalizedDate ?? raw.date;

    for (const field of ['location', 'venue', 'game'] as const) {
      normalized[field] = raw[field];
      if (raw[field].length > 160) {
        rowIssues.push({
          severity: 'error',
          code: 'value_too_long',
          row: sourceRow,
          field,
          message: `“${field}” must be 160 characters or fewer.`,
        });
      }
    }

    const completion = parseCompletionTime(raw.completion_time);
    if (!completion) {
      rowIssues.push({
        severity: 'error',
        code: 'invalid_completion_time',
        row: sourceRow,
        field: 'completion_time',
        message: 'Use minutes, MM:SS or HH:MM:SS for completion time.',
      });
    } else {
      normalized.completion_time = completion.normalized;
      normalized.completion_seconds = completion.seconds;
    }

    if (!raw.players) {
      rowIssues.push({
        severity: 'warning',
        code: 'default_players',
        row: sourceRow,
        field: 'players',
        message: 'Player count is blank; the preview uses 2.',
      });
    } else {
      const players = parseInteger(raw.players, 1, 100);
      if (players === null) {
        rowIssues.push({
          severity: 'error',
          code: 'invalid_players',
          row: sourceRow,
          field: 'players',
          message: 'Players must be a whole number from 1 to 100.',
        });
      } else normalized.players = players;
    }

    if (!raw.allotted_minutes) {
      rowIssues.push({
        severity: 'warning',
        code: 'default_allotted_minutes',
        row: sourceRow,
        field: 'allotted_minutes',
        message: 'Time limit is blank; the preview uses 60 minutes.',
      });
    } else {
      const allottedMinutes = parseInteger(raw.allotted_minutes, 1, 360);
      if (allottedMinutes === null) {
        rowIssues.push({
          severity: 'error',
          code: 'invalid_allotted_minutes',
          row: sourceRow,
          field: 'allotted_minutes',
          message: 'Time limit must be a whole number from 1 to 360 minutes.',
        });
      } else normalized.allotted_minutes = allottedMinutes;
    }

    if (
      normalized.completion_seconds !== null
      && normalized.completion_seconds > normalized.allotted_minutes * 60
    ) {
      rowIssues.push({
        severity: 'warning',
        code: 'over_allotted_time',
        row: sourceRow,
        field: 'completion_time',
        message: 'Completion time is longer than the stated limit. It will be kept as recorded.',
      });
    }

    const escaped = parseOutcome(raw.escaped);
    if (escaped === undefined) {
      rowIssues.push({
        severity: 'error',
        code: 'invalid_outcome',
        row: sourceRow,
        field: 'escaped',
        message: 'Outcome must be yes/no, true/false, escaped/failed, or blank.',
      });
    } else normalized.escaped = escaped;

    normalized.public_note = raw.public_note;
    if (raw.public_note.length > 2000) {
      rowIssues.push({
        severity: 'error',
        code: 'note_too_long',
        row: sourceRow,
        field: 'public_note',
        message: 'Public note must be 2,000 characters or fewer.',
      });
    }

    issues.push(...rowIssues);
    rowPreviews.push({
      sourceRow,
      valid: !rowIssues.some((issue) => issue.severity === 'error'),
      normalized,
      issues: rowIssues,
    });
  }

  const previewedSourceRows = new Set(rowPreviews.map((row) => row.sourceRow));
  issues.push(...parserIssues.filter((issue) => issue.row === undefined || !previewedSourceRows.has(issue.row)));

  const seenVisits = new Map<string, number>();
  for (const row of rowPreviews.filter((candidate) => candidate.valid)) {
    const key = [
      row.normalized.date,
      row.normalized.venue.toLowerCase(),
      row.normalized.game.toLowerCase(),
    ].join('|');
    const previousRow = seenVisits.get(key);
    if (previousRow) {
      const issue: ImportIssue = {
        severity: 'warning',
        code: 'possible_duplicate',
        row: row.sourceRow,
        message: `Possible duplicate of row ${previousRow}: same date, venue and game.`,
      };
      row.issues.push(issue);
      issues.push(issue);
    } else seenVisits.set(key, row.sourceRow);
  }

  return summarize(totalRows, rowPreviews, issues, recognizedHeaders, ignoredHeaders, missingHeaders);
}

export function exportValidRowsCsv(preview: ImportPreview): string {
  if (preview.parseErrors > 0) {
    throw new Error('Fix CSV parsing errors before downloading a clean file.');
  }

  const validRows = preview.rows
    .filter((row) => row.valid)
    .map(({ normalized }) => ({
      date: normalized.date,
      location: normalized.location,
      venue: normalized.venue,
      game: normalized.game,
      completion_time: normalized.completion_time,
      players: normalized.players,
      allotted_minutes: normalized.allotted_minutes,
      escaped: normalized.escaped === null ? '' : normalized.escaped,
      public_note: normalized.public_note,
    }));

  return Papa.unparse(validRows, { columns: [...canonicalImportHeaders] });
}
