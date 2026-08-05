import history from '../data/rooms.json';
import upcomingData from '../data/upcoming.json';

export interface Room {
  id: number;
  date: string;
  location: string;
  venue: string | null;
  game: string | null;
  completionTime: string | null;
  completionSeconds: number | null;
  players: number;
  allottedMinutes: number;
  notes: string | null;
  publicNote?: string | null;
  sourceFlags: string[];
  photo?: {
    src: string;
    alt: string;
    caption?: string | null;
    width?: number;
    height?: number;
  } | null;
}

export interface UpcomingEvent {
  id: string;
  date: string;
  time?: string | null;
  location: string;
  venue: string;
  game: string;
  note?: string | null;
}

export const source = history.source;
export const rooms = history.rooms as Room[];
export const upcoming = upcomingData.events as UpcomingEvent[];

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function roomSlug(room: Room): string {
  const label = room.game ?? room.venue ?? `room-${room.id}`;
  return `${String(room.id).padStart(3, '0')}-${slugify(label)}`;
}

export function roomTitle(room: Room): string {
  return room.game ?? 'Room name lost to history';
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(new Date(`${value}T12:00:00Z`));
}

export function formatDuration(value: string | null): string {
  if (!value) return 'Unknown';
  const [hours, minutes, seconds] = value.split(':').map(Number);
  if (hours === 0) return `${minutes}:${String(seconds).padStart(2, '0')}`;
  const secondsLabel = seconds === 0 ? '' : ` ${String(seconds).padStart(2, '0')}s`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m${secondsLabel}`;
}

export function roomPhotoCaption(room: Room): string | null {
  if (!room.photo?.caption) return null;
  if (room.photo.caption === "Post-game team photo recovered from the venue's email.") {
    return 'Post-game team photo.';
  }
  return room.photo.caption;
}

function countBy(values: Array<string | null>): Array<{ label: string; count: number }> {
  const counts = new Map<string, { label: string; count: number }>();
  for (const value of values) {
    if (!value) continue;
    const key = slugify(value);
    const existing = counts.get(key);
    counts.set(key, {
      label: value,
      count: (existing?.count ?? 0) + 1,
    });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export const roomsNewestFirst = [...rooms].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
export const locations = countBy(rooms.map((room) => room.location));
export const venues = countBy(rooms.map((room) => room.venue));
export const years = countBy(rooms.map((room) => room.date.slice(0, 4))).sort((a, b) => a.label.localeCompare(b.label));
export const timedRooms = rooms.filter((room) => room.completionSeconds !== null);
export const shortestRecorded = [...timedRooms].sort((a, b) => (a.completionSeconds ?? Infinity) - (b.completionSeconds ?? Infinity))[0];

export const stats = {
  total: rooms.length,
  years: new Set(rooms.map((room) => room.date.slice(0, 4))).size,
  locations: locations.length,
  venues: venues.length,
  timed: timedRooms.length,
  first: rooms[0],
  latest: roomsNewestFirst[0],
};
