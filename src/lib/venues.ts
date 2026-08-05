import { rooms, slugify, type Room } from './rooms';

export interface VenueLocationCount {
  label: string;
  count: number;
}

export interface VenueProfile {
  name: string;
  slug: string;
  rooms: Room[];
  visits: number;
  locations: VenueLocationCount[];
  firstVisit: Room;
  latestVisit: Room;
  recordedTimes: number;
  fastestRoom: Room | null;
  photoCount: number;
}

function countLocations(venueRooms: Room[]): VenueLocationCount[] {
  const counts = new Map<string, VenueLocationCount>();

  for (const room of venueRooms) {
    const key = slugify(room.location);
    const existing = counts.get(key);
    counts.set(key, {
      label: room.location,
      count: (existing?.count ?? 0) + 1,
    });
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildVenueProfiles(sourceRooms: Room[]): VenueProfile[] {
  const grouped = new Map<string, Room[]>();

  for (const room of sourceRooms) {
    if (!room.venue) continue;
    const slug = slugify(room.venue);
    const existing = grouped.get(slug) ?? [];
    existing.push(room);
    grouped.set(slug, existing);
  }

  return [...grouped.entries()]
    .map(([slug, venueRooms]) => {
      const newestFirst = [...venueRooms]
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
      const oldestFirst = [...newestFirst].reverse();
      const timedRooms = newestFirst
        .filter((room) => room.completionSeconds !== null)
        .sort((a, b) => (a.completionSeconds ?? Infinity) - (b.completionSeconds ?? Infinity));

      return {
        name: newestFirst[0].venue as string,
        slug,
        rooms: newestFirst,
        visits: newestFirst.length,
        locations: countLocations(newestFirst),
        firstVisit: oldestFirst[0],
        latestVisit: newestFirst[0],
        recordedTimes: timedRooms.length,
        fastestRoom: timedRooms[0] ?? null,
        photoCount: newestFirst.filter((room) => room.photo).length,
      };
    })
    .sort((a, b) => b.visits - a.visits
      || b.latestVisit.date.localeCompare(a.latestVisit.date)
      || a.name.localeCompare(b.name));
}

export const venueProfiles = buildVenueProfiles(rooms);
const venuesBySlug = new Map(venueProfiles.map((venue) => [venue.slug, venue]));

export function venueProfileForRoom(room: Room): VenueProfile | null {
  if (!room.venue) return null;
  return venuesBySlug.get(slugify(room.venue)) ?? null;
}
