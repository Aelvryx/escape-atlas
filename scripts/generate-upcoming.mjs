import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const valueFor = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};

const start = valueFor('--start');
const end = valueFor('--end');
const output = valueFor('--output') ?? 'src/data/upcoming.json';
const helper = process.env.FASTMAIL_CALENDAR_HELPER
  ?? '/home/mei/.openclaw/workspace/scripts/fastmail_read.py';

if (!start || !end) {
  console.error('Usage: node scripts/generate-upcoming.mjs --start <ISO> --end <ISO> [--output <json>]');
  process.exit(2);
}

function runHelper(commandArgs) {
  return execFileSync('python3', [helper, ...commandArgs], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function unfoldIcs(raw) {
  return raw.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
}

function unescapeIcs(value) {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function property(lines, name) {
  const line = lines.find((entry) => entry.split(':', 1)[0].split(';', 1)[0].toUpperCase() === name);
  return line ? unescapeIcs(line.slice(line.indexOf(':') + 1)) : null;
}

function dateAndTime(value) {
  if (!value) return { date: null, time: null };
  const dateMatch = value.match(/^(\d{4})(\d{2})(\d{2})/);
  const timeMatch = value.match(/T(\d{2})(\d{2})/);
  return {
    date: dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null,
    time: timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : null,
  };
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const startDate = start.slice(0, 10);
const endDate = end.slice(0, 10);
const calendar = JSON.parse(runHelper(['calendar', '--start', startDate, '--end', endDate]));
if (!Array.isArray(calendar.resources)) throw new Error('Fastmail helper returned no calendar resources array.');
const summaryPattern = /^(?:🗝️\s*)?Escape room\s*[—:-]\s*(.+?)\s+@\s+(.+)$/i;
const candidates = [];

for (const resource of calendar.resources) {
  const unfolded = unfoldIcs(resource.ics ?? '');
  let eventLines = null;
  for (const line of unfolded) {
    if (line.toUpperCase() === 'BEGIN:VEVENT') eventLines = [];
    else if (line.toUpperCase() === 'END:VEVENT' && eventLines) {
      const summary = property(eventLines, 'SUMMARY');
      const summaryMatch = summary?.match(summaryPattern);
      if (summaryMatch) candidates.push({ lines: eventLines, game: summaryMatch[1].trim(), venue: summaryMatch[2].trim() });
      eventLines = null;
    } else if (eventLines) eventLines.push(line);
  }
}

const events = candidates.map((candidate) => {
  const lines = candidate.lines;
  const dtstartLine = lines.find((line) => line.split(':', 1)[0].split(';', 1)[0].toUpperCase() === 'DTSTART');
  const dtstart = dtstartLine ? dtstartLine.slice(dtstartLine.indexOf(':') + 1) : null;
  const { date, time } = dateAndTime(dtstart);
  const location = property(lines, 'LOCATION');
  if (!date || !location) throw new Error(`Escape Atlas event ${candidate.uid} is missing DTSTART or LOCATION.`);
  return {
    id: `${date}-${slug(candidate.game)}-${slug(candidate.venue)}`,
    date,
    time,
    location,
    venue: candidate.venue,
    game: candidate.game,
    note: null,
  };
}).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));

const snapshot = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: 'Fastmail calendar (public-safe derived snapshot)',
  window: { start, end },
  eventConvention: 'Escape room — <game> @ <venue>',
  events,
};

await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Generated ${events.length} public upcoming event(s) in ${output}; raw ICS and attendees were not written.`);
