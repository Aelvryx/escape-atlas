import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLocationConnections,
  buildLocationProfiles,
  locationProfileForRoom,
  locationProfiles,
} from '../src/lib/locations';
import { rooms } from '../src/lib/rooms';

test('maps every canonical room to one stable location page', () => {
  const profiles = buildLocationProfiles(rooms);
  const mappedRooms = profiles.flatMap((location) => location.rooms);

  assert.equal(profiles.length, 56);
  assert.equal(mappedRooms.length, rooms.length);
  assert.equal(new Set(mappedRooms.map((room) => room.id)).size, rooms.length);
  assert.equal(new Set(profiles.map((location) => location.slug)).size, profiles.length);
  assert.equal(locationProfileForRoom(rooms[0]).slug, profiles.find((location) => location.rooms.some((room) => room.id === 1))?.slug);
});

test('builds useful return-trip and operator summaries for Reading', () => {
  const reading = locationProfiles.find((location) => location.slug === 'reading');

  assert.ok(reading);
  assert.equal(reading.visits, 15);
  assert.equal(reading.operators.length, 4);
  assert.equal(reading.visitDays.length, 14);
  assert.equal(reading.busiestDay.date, '2018-06-11');
  assert.equal(reading.busiestDay.rooms.length, 2);
  assert.equal(reading.firstVisit.id, 24);
  assert.equal(reading.latestVisit.id, 159);
});

test('preserves multi-room day evidence instead of flattening visits', () => {
  const margate = locationProfiles.find((location) => location.slug === 'margate');

  assert.ok(margate);
  assert.equal(margate.visits, 6);
  assert.equal(margate.visitDays.length, 3);
  assert.equal(margate.busiestDay.date, '2018-11-11');
  assert.deepEqual(margate.busiestDay.rooms.map((room) => room.id), [61, 62, 63]);
  assert.equal(margate.operators.length, 2);
});

test('derives route connections only from same-day or adjacent-day history', () => {
  const halifax = locationProfiles.find((location) => location.slug === 'halifax');
  assert.ok(halifax);

  const connections = buildLocationConnections(halifax);
  const wakefield = connections.find((connection) => connection.slug === 'wakefield');
  const nottingham = connections.find((connection) => connection.slug === 'nottingham');

  assert.deepEqual(wakefield, {
    name: 'Wakefield',
    slug: 'wakefield',
    recordedRuns: 1,
    latestDate: '2026-07-11',
  });
  assert.deepEqual(nottingham, {
    name: 'Nottingham',
    slug: 'nottingham',
    recordedRuns: 1,
    latestDate: '2026-07-13',
  });
});
