// Tests for the Spec.md rules in mockup/store.js. Run: node --test
const test = require('node:test');
const assert = require('node:assert');
const Store = require('../mockup/store.js');

const H = Store.HOUR;
const D = 24 * H;

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

test('inventory matches Spec.md: 40 car, 10 motorcycle, 3 EV, 10 bicycle, all booked per day', () => {
  const db = fresh();
  const of = (t) => db.spots.filter((s) => s.type === t);
  assert.deepStrictEqual(['car', 'motorcycle', 'ev', 'bicycle'].map((t) => of(t).length), [40, 10, 3, 10]);
  assert.deepStrictEqual(['car', 'motorcycle', 'ev', 'bicycle'].map((t) => of(t)[0].id), ['C-01', 'M-01', 'E-1', 'B-01']);
  assert.ok(Object.values(Store.TYPES).every((t) => t.unit === 'day'));
});

test('a booking holds the spot for the whole day, free again the next day (EV too)', () => {
  const db = fresh();
  Store.reserve(db, 'Alex Morgan', 'E-1', tomorrowAt(8));
  assert.ok(!Store.freeSpots(db, 'ev', tomorrowAt(15)).some((s) => s.id === 'E-1'));
  assert.ok(Store.freeSpots(db, 'ev', tomorrowAt(8) + D).some((s) => s.id === 'E-1'));
});

test('all-day bookings start 08:00; booked later the same day, they start now', () => {
  const db = fresh();
  const tomorrow = Store.startOfDay(tomorrowAt(12));
  assert.strictEqual(Store.startFor(db, tomorrow), tomorrow + 8 * H);
  setNow(db, tomorrow + 14 * H);
  assert.strictEqual(Store.startFor(db, tomorrow), tomorrow + 14 * H);
});

test('drivers can book up to 7 calendar days ahead, not further', () => {
  const db = fresh();
  const days = Store.bookingDays(db);
  assert.strictEqual(days.length, 8); // today + 7 days, weekends included
  const last = days[days.length - 1];
  Store.reserve(db, 'Alex Morgan', 'C-01', Store.startFor(db, last));
  assert.throws(() => Store.reserve(db, 'Alex Morgan', 'C-02', Store.startFor(db, last + D)), /7 days/);
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
  assert.deepStrictEqual(Store.load().reservations.map((r) => r.spotId), ['C-01', 'C-02']);
});

test('10 people tap the same spot at once: exactly 1 gets it', () => {
  const db = fresh();
  const people = Array.from({ length: 10 }, (_, i) => `Person ${i + 1}`);
  const tabs = people.map(() => Store.load()); // everyone's screen shows C-01 as free
  const booked = people.filter((p, i) => {
    try { Store.reserve(tabs[i], p, 'C-01', tomorrowAt(8)); return true; } catch (e) { return false; }
  });
  assert.strictEqual(booked.length, 1);
  assert.strictEqual(Store.load().reservations.length, 1);
});

test('simulate 10 bookings: 10 different drivers, no spot booked twice', () => {
  const db = fresh();
  const log = Store.simulate(db);
  const res = Store.load().reservations;
  assert.strictEqual(res.length, 10);
  assert.strictEqual(new Set(res.map((r) => r.driver)).size, 10);
  assert.strictEqual(new Set(res.map((r) => `${r.spotId}@${r.from}`)).size, 10);
  assert.ok(log.some((line) => /was just taken/.test(line)));
});

test('cancel frees the spot and does not count as a no-show', () => {
  const db = fresh();
  const r = Store.reserve(db, 'Alex Morgan', 'C-01', tomorrowAt(8));
  Store.cancel(db, r.id, 'Alex Morgan');
  assert.ok(Store.freeSpots(db, 'car', tomorrowAt(8)).some((s) => s.id === 'C-01'));
  setNow(db, tomorrowAt(12));
  Store.releaseExpired(db);
  assert.strictEqual(Store.noShows(db, 'Alex Morgan'), 0);
  assert.throws(() => Store.cancel(db, r.id, 'Alex Morgan'), /cannot be cancelled/);
});

test('a driver cannot cancel someone else\'s reservation', () => {
  const db = fresh();
  const r = Store.reserve(db, 'Alex Morgan', 'C-01', tomorrowAt(8));
  assert.throws(() => Store.cancel(db, r.id, 'Sam Lee'), /cannot be cancelled/);
});

test('past times are rejected; any entered name can book (no driver list)', () => {
  const db = fresh();
  assert.throws(() => Store.reserve(db, 'Alex Morgan', 'C-01', Store.now(db) - 3 * H), /already past/);
  assert.strictEqual(Store.reserve(db, 'New Person', 'C-01', tomorrowAt(8)).driver, 'New Person');
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

test('warning shows after 3 no-shows, not before', () => {
  const db = fresh();
  for (let i = 0; i < 3; i++) {
    Store.reserve(db, 'Alex Morgan', 'C-01', tomorrowAt(8) + i * D);
    setNow(db, tomorrowAt(11) + i * D);
    Store.releaseExpired(db);
    assert.strictEqual(Store.showNoShowWarning(db, 'Alex Morgan'), i === 2);
  }
});

test('sign-in by name: any name works, known names keep their spelling', () => {
  const db = fresh();
  assert.strictEqual(Store.signIn(db, '  alex morgan '), 'Alex Morgan');
  assert.strictEqual(Store.signIn(db, 'Kim Park'), 'Kim Park');
  assert.throws(() => Store.signIn(db, '   '), /Enter your name/);
});

test('admin sign-on: wrong password refused, right one allowed', () => {
  const db = fresh();
  assert.throws(() => Store.adminSignIn(db, Store.DEMO_ADMIN.user, 'wrong'), /Wrong/);
  assert.strictEqual(Store.isAdmin(db), false);
  Store.adminSignIn(db, Store.DEMO_ADMIN.user, Store.DEMO_ADMIN.password);
  assert.strictEqual(Store.isAdmin(db), true);
});

test('only a signed-in admin can change spots, block or book for someone', () => {
  const db = fresh();
  assert.throws(() => Store.addSpot(db, 'car'), /Admin sign-on/);
  assert.throws(() => Store.removeSpot(db, 'C-01'), /Admin sign-on/);
  assert.throws(() => Store.blockSpot(db, 'C-01', tomorrowAt(0)), /Admin sign-on/);
  assert.throws(() => Store.reserveFor(db, 'Sam Lee', 'C-01', tomorrowAt(0)), /Admin sign-on/);
});

test('admin: add spots with automatic or typed number, remove them', () => {
  const db = fresh();
  Store.adminSignIn(db, Store.DEMO_ADMIN.user, Store.DEMO_ADMIN.password);
  assert.strictEqual(Store.addSpot(db, 'bicycle').id, 'B-11');
  assert.strictEqual(Store.addSpot(db, 'car', 'c-50').id, 'C-50');
  assert.throws(() => Store.addSpot(db, 'car', 'C-01'), /already exists/);
  Store.removeSpot(db, 'B-11');
  assert.strictEqual(db.spots.filter((s) => s.type === 'bicycle').length, 10);
});

test('admin: block a spot for a day; drivers see it booked', () => {
  const db = fresh();
  Store.adminSignIn(db, Store.DEMO_ADMIN.user, Store.DEMO_ADMIN.password);
  const day = Store.startOfDay(tomorrowAt(12));
  Store.blockSpot(db, 'C-03', day);
  assert.strictEqual(Store.statusOn(db, 'C-03', day), 'blocked');
  assert.ok(!Store.freeSpots(db, 'car', Store.startFor(db, day)).some((s) => s.id === 'C-03'));
  assert.throws(() => Store.blockSpot(db, 'C-03', day), /just taken/);
});

test('admin: book on behalf of someone; it shows in their reservations', () => {
  const db = fresh();
  Store.adminSignIn(db, Store.DEMO_ADMIN.user, Store.DEMO_ADMIN.password);
  const day = Store.startOfDay(tomorrowAt(12));
  Store.reserveFor(db, 'Priya Shah', 'C-04', day);
  assert.strictEqual(Store.statusOn(db, 'C-04', day), 'reserved');
  assert.strictEqual(Store.reservationsOf(db, 'Priya Shah')[0].spotId, 'C-04');
});

test('admin sees status per spot: free, reserved, checked-in', () => {
  const db = fresh();
  setNow(db, tomorrowAt(7));
  const a = Store.reserve(db, 'Alex Morgan', 'C-01', tomorrowAt(8));
  Store.reserve(db, 'Sam Lee', 'C-02', tomorrowAt(8));
  setNow(db, tomorrowAt(9));
  Store.checkIn(db, a.id);
  const day = Store.startOfDay(tomorrowAt(9));
  assert.deepStrictEqual(['C-01', 'C-02', 'C-03'].map((id) => Store.statusOn(db, id, day)), ['checked-in', 'reserved', 'free']);
});
