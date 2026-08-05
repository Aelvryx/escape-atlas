import { locations, rooms, roomsNewestFirst, stats, venues, years } from './rooms';

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) return ordered[middle];
  return Math.round((ordered[middle - 1] + ordered[middle]) / 2);
}

function formatSeconds(totalSeconds: number | null): string {
  if (totalSeconds === null) return 'Unknown';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const recordedTimes = rooms
  .map((room) => room.completionSeconds)
  .filter((value): value is number => value !== null);
const busiestYear = [...years].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))[0];
const favouriteLocation = locations[0];
const favouriteVenue = venues[0];

export const publicProfile = {
  slug: 'anthony-and-trenna',
  displayName: 'Anthony + Trenna',
  initials: 'A+T',
  handle: '@anthony-and-trenna',
  homeLocation: 'United Kingdom',
  bio: 'A shared map of every puzzle, panic and last-second breakthrough since 2015.',
};

export const profileStats = {
  rooms: stats.total,
  locations: stats.locations,
  venues: stats.venues,
  recordedTimes: recordedTimes.length,
  firstRoom: stats.first,
  latestRoom: stats.latest,
  medianTime: formatSeconds(median(recordedTimes)),
  busiestYear,
  favouriteLocation,
  favouriteVenue,
};

export const profileHighlights = [
  {
    eyebrow: 'Peak chapter',
    value: busiestYear.label,
    title: `${busiestYear.count} rooms in one year`,
    detail: 'The year the hobby stopped looking casual and became part of the family calendar.',
  },
  {
    eyebrow: 'Typical clock',
    value: profileStats.medianTime,
    title: `Across ${recordedTimes.length} timed rooms`,
    detail: 'The median recorded finish: enough urgency to be exciting, rarely enough to be sensible.',
  },
  {
    eyebrow: 'Home territory',
    value: favouriteLocation.label,
    title: `${favouriteLocation.count} visits`,
    detail: `${favouriteVenue.label} is the most revisited operator, with ${favouriteVenue.count} rooms played.`,
  },
];

export const recentProfileRooms = roomsNewestFirst.slice(0, 5);
