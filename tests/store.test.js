// Tests for the Spec.md and design rules in mockup/store.js. Run: node --test
const test = require('node:test');
const assert = require('node:assert');
const Store = require('../mockup/store.js');

const H = Store.HOUR;

// Fresh data in memory for every test.
function fresh() {
  const data = {};
  Store.useStorage({ getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } });
  return Store.reset();
}
// Tomorrow at a given hour (local time), so tests never cross midnight by accident.
function tomorrowAt(hour) { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, hour).getTime(); }
// Move the demo clock so "now" is exactly the given time (saved, so a refresh keeps it).
function setNow(db, ms) { db.clockOffsetMs = ms - Date.now(); Store.save(db); }

test('inventory matches Spec.md, numbers match the design (C-01, M-01, E-1)', () => {
  const db = fresh();
  const of = (t) => db.spots.filter((s) => s.type === t);
  assert.deepStrictEqual([of('car').length, of('motorcycle').length, of('ev').length], [40, 10, 3]);
  assert.deepStrictEqual([of('car')[0].id, of('motorcycle')[0].id, of('ev')[0].id], ['C-01', 'M-01', 'E-1']);
});

test('car booking holds the spot for the whole day, free again the next day', () => {
  const db = fresh();
  Store.reserve(db, 'Alex Morgan', 'C-01', tomorrowAt(8));
  assert.ok(!Store.freeSpots(db, 'car', tomorrowAt(15)).some((s) => s.id === 'C-01'));
  assert.ok(Store.freeSpots(db, 'car', tomorrowAt(8) + 24 * H).some((s) => s.id === 'C-01'));
});

test('all-day bookings start 08:00; booked later the same day, they start now', () => {
  const db = fresh();
  const tomorrow = Store.startOfDay(tomorrowAt(12));
  assert.strictEqual(Store.startFor(db, 'car', tomorrow), tomorrow + 8 * H);
  setNow(db, tomorrow + 14 * H);
  assert.strictEqual(Store.startFor(db, 'car', tomorrow), tomorrow + 14 * H);
  assert.strictEqual(Store.startFor(db, 'ev', tomorrow, 16), tomorrow + 16 * H);
});

test('day picker offers today and next working days, no weekends', () => {
  const db = fresh();
  const days = Store.bookingDays(db);
  assert.strictEqual(days.length, 4);
  assert.ok(days.every((d) => ![0, 6].includes(new Date(d).getDay())));
});

test('EV booking holds one hour only', () => {
  const db = fresh();
  Store.reserve(db, 'Alex Morgan', 'E-1', tomorrowAt(10));
  const free = (ms) => Store.freeSpots(db, 'ev', ms).some((s) => s.id === 'E-1');
  assert.strictEqual(free(tomorrowAt(10) + H / 2), false);
  assert.strictEqual(free(tomorrowAt(11)), true);
});

test('a taken spot cannot be booked twice (first come, first served)', () => {
  const db = fresh();
  Store.reserve(db, 'Alex Morgan', 'C-01', tomorrowAt(8));
  assert.throws(() => Store.reserve(db, 'Sam Lee', 'C-01', tomorrowAt(12)), /just taken/);
});

test('two tabs booking the same spot: second one is refused, first booking survives', () => {
  fresh();
  const tabA = Store.load(); // both tabs opened the page before anyone booked
  const tabB = Store.load();
  Store.reserve(tabA, 'Alex Morgan', 'C-01', tomorrowAt(8));
  assert.throws(() => Store.reserve(tabB, 'Sam Lee', 'C-01', tomorrowAt(8)), /just taken/);
  Store.reserve(tabB, 'Sam Lee', 'C-02', tomorrowAt(8));
  const saved = Store.load().reservations.map((r) => r.spotId);
  assert.deepStrictEqual(saved, ['C-01', 'C-02']);
});

test('unknown drivers and past times are rejected', () => {
  const db = fresh();
  assert.throws(() => Store.reserve(db, 'Nobody', 'C-01', tomorrowAt(8)), /Unknown driver/);
  assert.throws(() => Store.reserve(db, 'Alex Morgan', 'C-01', Store.now(db) - 3 * H), /already past/);
});

test('not checked in within 2 hours: released and spot free again', () => {
  const db = fresh();
  const r = Store.reserve(db, 'Alex Morgan', 'C-01', tomorrowAt(8));
  setNow(db, tomorrowAt(10) + 60 * 1000); // 2 hours and 1 minute after start
  assert.strictEqual(Store.releaseExpired(db), 1);
  assert.strictEqual(db.reservations.find((x) => x.id === r.id).status, 'released');
  assert.ok(Store.freeSpots(db, 'car', tomorrowAt(12)).some((s) => s.id === 'C-01'));
});

test('check-in works before the deadline, not after', () => {
  const db = fresh();
  const a = Store.reserve(db, 'Alex Morgan', 'C-01', tomorrowAt(8));
  const b = Store.reserve(db, 'Sam Lee', 'C-02', tomorrowAt(8));
  setNow(db, tomorrowAt(9));
  assert.strictEqual(Store.checkIn(db, a.id).status, 'checked-in');
  setNow(db, tomorrowAt(11));
  assert.throws(() => Store.checkIn(db, b.id), /not possible/);
});

test('admin sees today status per spot: free, reserved, checked-in', () => {
  const db = fresh();
  setNow(db, tomorrowAt(7));
  const a = Store.reserve(db, 'Alex Morgan', 'C-01', tomorrowAt(8));
  Store.reserve(db, 'Sam Lee', 'C-02', tomorrowAt(8));
  setNow(db, tomorrowAt(9));
  Store.checkIn(db, a.id);
  assert.deepStrictEqual(['C-01', 'C-02', 'C-03'].map((id) => Store.statusToday(db, id)), ['checked-in', 'reserved', 'free']);
});

test('warning shows after 3 no-shows, not before', () => {
  const db = fresh();
  for (let i = 0; i < 3; i++) {
    Store.reserve(db, 'Alex Morgan', 'C-01', tomorrowAt(8) + i * 24 * H);
    setNow(db, tomorrowAt(11) + i * 24 * H);
    Store.releaseExpired(db);
    assert.strictEqual(Store.showNoShowWarning(db, 'Alex Morgan'), i === 2);
  }
});

test('sign-in by name only, case does not matter, unknown names rejected', () => {
  const db = fresh();
  assert.strictEqual(Store.signIn(db, '  alex morgan '), 'Alex Morgan');
  assert.throws(() => Store.signIn(db, 'Nobody'), /not registered/);
});

test('admin: add and remove drivers, no duplicates', () => {
  const db = fresh();
  Store.addDriver(db, 'Jordan Blake');
  assert.throws(() => Store.addDriver(db, 'jordan blake'), /already exists/);
  Store.removeDriver(db, 'Jordan Blake');
  assert.ok(!db.drivers.includes('Jordan Blake'));
});

test('admin: add spots with automatic or typed number, remove them', () => {
  const db = fresh();
  assert.strictEqual(Store.nextSpotId(db, 'car'), 'C-41');
  assert.strictEqual(Store.addSpot(db, 'ev').id, 'E-4');
  assert.strictEqual(Store.addSpot(db, 'car', 'c-50').id, 'C-50');
  assert.throws(() => Store.addSpot(db, 'car', 'C-01'), /already exists/);
  Store.removeSpot(db, 'E-4');
  assert.strictEqual(db.spots.filter((s) => s.type === 'ev').length, 3);
});
