import assert from 'node:assert/strict';
import test from 'node:test';
import { rooms, stats } from '../src/lib/rooms';
import { buildVenueProfiles, venueProfileForRoom, venueProfiles } from '../src/lib/venues';

test('maps every named room to one stable operator page', () => {
  const profiles = buildVenueProfiles(rooms);
  const mappedRooms = profiles.flatMap((venue) => venue.rooms);

  assert.equal(profiles.length, 82);
  assert.equal(stats.venues, 82);
  assert.equal(mappedRooms.length, rooms.filter((room) => room.venue).length);
  assert.equal(new Set(mappedRooms.map((room) => room.id)).size, rooms.filter((room) => room.venue).length);
  assert.equal(new Set(profiles.map((venue) => venue.slug)).size, profiles.length);
  assert.equal(venueProfileForRoom(rooms[94]), null);
  assert.equal(venueProfileForRoom(rooms[116]), null);
});

test('merges harmless casing drift instead of inventing duplicate operators', () => {
  const coDecode = venueProfiles.find((venue) => venue.slug === 'co-decode');
  const knockOut = venueProfiles.find((venue) => venue.slug === 'knock-out-escape-rooms');

  assert.ok(coDecode);
  assert.equal(coDecode.name, 'Co-decode');
  assert.equal(coDecode.visits, 2);
  assert.deepEqual(coDecode.rooms.map((room) => room.id), [74, 13]);

  assert.ok(knockOut);
  assert.equal(knockOut.name, 'Knock Out Escape Rooms');
  assert.equal(knockOut.visits, 2);
  assert.deepEqual(knockOut.rooms.map((room) => room.id), [159, 70]);
});

test('builds useful multi-location operator summaries', () => {
  const excitingEscapes = venueProfiles.find((venue) => venue.slug === 'exciting-escapes');

  assert.ok(excitingEscapes);
  assert.equal(excitingEscapes.visits, 12);
  assert.deepEqual(excitingEscapes.locations, [
    { label: 'Basingstoke', count: 5 },
    { label: 'Southampton', count: 4 },
    { label: 'Portsmouth', count: 3 },
  ]);
  assert.equal(excitingEscapes.firstVisit.id, 18);
  assert.equal(excitingEscapes.latestVisit.id, 127);
  assert.equal(excitingEscapes.recordedTimes, 11);
  assert.equal(excitingEscapes.fastestRoom?.id, 23);
});

test('orders the directory by repeat history, then recency', () => {
  assert.equal(venueProfiles[0].name, 'Exciting Escapes');
  assert.equal(venueProfiles[0].visits, 12);

  for (let index = 1; index < venueProfiles.length; index += 1) {
    assert.ok(venueProfiles[index - 1].visits >= venueProfiles[index].visits);
  }
});
