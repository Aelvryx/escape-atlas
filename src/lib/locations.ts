import { rooms, slugify, type Room } from './rooms';
import { buildVenueProfiles, type VenueProfile } from './venues';

export interface LocationVisitDay {
  date: string;
  rooms: Room[];
}

export interface LocationOperator {
  venue: VenueProfile;
  rooms: Room[];
  visits: number;
}

export interface LocationProfile {
  name: string;
  slug: string;
  rooms: Room[];
  visits: number;
  operators: LocationOperator[];
  visitDays: LocationVisitDay[];
  firstVisit: Room;
  latestVisit: Room;
  busiestDay: LocationVisitDay;
  recordedTimes: number;
  photoCount: number;
}

export interface LocationConnection {
  name: string;
  slug: string;
  recordedRuns: number;
  latestDate: string;
}

function groupVisitDays(locationRooms: Room[]): LocationVisitDay[] {
  const grouped = new Map<string, Room[]>();

  for (const room of locationRooms) {
    const existing = grouped.get(room.date) ?? [];
    existing.push(room);
    grouped.set(room.date, existing);
  }

  return [...grouped.entries()]
    .map(([date, dayRooms]) => ({
      date,
      rooms: [...dayRooms].sort((a, b) => a.id - b.id),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function buildLocationProfiles(sourceRooms: Room[]): LocationProfile[] {
  const grouped = new Map<string, Room[]>();
  const sourceVenues = buildVenueProfiles(sourceRooms);

  for (const room of sourceRooms) {
    const slug = slugify(room.location);
    const existing = grouped.get(slug) ?? [];
    existing.push(room);
    grouped.set(slug, existing);
  }

  return [...grouped.entries()]
    .map(([slug, locationRooms]) => {
      const newestFirst = [...locationRooms]
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
      const oldestFirst = [...newestFirst].reverse();
      const visitDays = groupVisitDays(newestFirst);
      const busiestDay = [...visitDays]
        .sort((a, b) => b.rooms.length - a.rooms.length || b.date.localeCompare(a.date))[0];
      const operatorProfiles = sourceVenues
        .filter((venue) => venue.locations.some((location) => slugify(location.label) === slug))
        .map((venue) => {
          const operatorRooms = venue.rooms
            .filter((room) => slugify(room.location) === slug)
            .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

          return {
            venue,
            rooms: operatorRooms,
            visits: operatorRooms.length,
          };
        })
        .sort((a, b) => b.visits - a.visits
          || b.rooms[0].date.localeCompare(a.rooms[0].date)
          || a.venue.name.localeCompare(b.venue.name));

      return {
        name: newestFirst[0].location,
        slug,
        rooms: newestFirst,
        visits: newestFirst.length,
        operators: operatorProfiles,
        visitDays,
        firstVisit: oldestFirst[0],
        latestVisit: newestFirst[0],
        busiestDay,
        recordedTimes: newestFirst.filter((room) => room.completionSeconds !== null).length,
        photoCount: newestFirst.filter((room) => room.photo).length,
      };
    })
    .sort((a, b) => b.visits - a.visits
      || b.operators.length - a.operators.length
      || b.latestVisit.date.localeCompare(a.latestVisit.date)
      || a.name.localeCompare(b.name));
}

function utcDay(value: string): number {
  return Date.parse(`${value}T12:00:00Z`);
}

export function buildLocationConnections(
  location: LocationProfile,
  sourceRooms: Room[] = rooms,
): LocationConnection[] {
  const connections = new Map<string, {
    name: string;
    dates: Set<string>;
    latestDate: string;
  }>();

  for (const anchor of location.rooms) {
    const anchorDay = utcDay(anchor.date);

    for (const candidate of sourceRooms) {
      const candidateSlug = slugify(candidate.location);
      if (candidateSlug === location.slug) continue;
      if (Math.abs(utcDay(candidate.date) - anchorDay) > 86_400_000) continue;

      const existing = connections.get(candidateSlug) ?? {
        name: candidate.location,
        dates: new Set<string>(),
        latestDate: candidate.date,
      };
      existing.dates.add([anchor.date, candidate.date].sort().join(':'));
      if (candidate.date > existing.latestDate) existing.latestDate = candidate.date;
      connections.set(candidateSlug, existing);
    }
  }

  return [...connections.entries()]
    .map(([slug, connection]) => ({
      name: connection.name,
      slug,
      recordedRuns: connection.dates.size,
      latestDate: connection.latestDate,
    }))
    .sort((a, b) => b.recordedRuns - a.recordedRuns
      || b.latestDate.localeCompare(a.latestDate)
      || a.name.localeCompare(b.name));
}

export const locationProfiles = buildLocationProfiles(rooms);
const locationsBySlug = new Map(locationProfiles.map((location) => [location.slug, location]));

export function locationProfileForRoom(room: Room): LocationProfile {
  return locationsBySlug.get(slugify(room.location)) as LocationProfile;
}
