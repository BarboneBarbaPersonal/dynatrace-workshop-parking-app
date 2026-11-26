// store.js - all data and rules of the mockup (from Spec.md and the design mockup).
// Works in the browser (as window.Store) and in Node tests (require).
// Data is saved in the browser's localStorage: one device only, as agreed for the pitch.
(function (root) {
  const KEY = 'parking-mockup-v3';
  const HOUR = 60 * 60 * 1000;
  const RELEASE_AFTER_HOURS = 2; // Spec: released if not checked in within 2 hours of start
  const NO_SHOW_WARNING_AT = 3;  // Spec: warning after 3 no-shows
  const DAYS_AHEAD = 7;          // Spec: book up to 7 calendar days ahead
  const DAY_START_HOUR = 8;      // Design: all-day bookings start 08:00 (check in by 10:00)
  const BLOCKED = '(blocked by admin)';

  // Demo admin account for the mockup only. This page is public, so this is NOT real security:
  // real admin sign-on needs a server (phase 5 in docs/PLAN.md).
  const DEMO_ADMIN = { user: 'admin', password: 'parking-demo' };

  // Spot types and counts from the Spec.md inventory table (all booked per day); numbers from the design.
  const TYPES = {
    car:        { label: 'Car',        count: 40, unit: 'day', prefix: 'C', pad: 2 },
    motorcycle: { label: 'Motorcycle', count: 10, unit: 'day', prefix: 'M', pad: 2 },
    ev:         { label: 'EV charger', count: 3,  unit: 'day', prefix: 'E', pad: 1 },
    bicycle:    { label: 'Bicycle',    count: 10, unit: 'day', prefix: 'B', pad: 2 },
  };

  // --- Storage: localStorage in the browser, a simple in-memory copy in tests ---
  function memoryStorage() {
    const data = {};
    return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
  }
  let storage = root.localStorage || memoryStorage();
  function useStorage(s) { storage = s; }

  // --- Starting data (fake, for the demo; sample names from the design mockup) ---
  const SAMPLE_NAMES = ['Alex Morgan', 'Priya Shah', 'Jonas Weber', 'Marta Novak', 'Luca Rossi',
    'Sam Lee', 'Elena Petrova', 'Tom Becker', 'Jordan Blake', 'Noor Haddad'];
  function seed() {
    const spots = [];
    for (const type of Object.keys(TYPES)) {
      for (let i = 1; i <= TYPES[type].count; i++) spots.push({ id: spotId(type, i), type });
    }
    return {
      spots,
      drivers: SAMPLE_NAMES.slice(), // names seen so far, used to keep one spelling per person
      reservations: [],
      nextId: 1,
      currentDriver: null,
      adminSignedIn: false,
      noShowSeen: false, // the no-show reminder was closed in this sign-in
      clockOffsetMs: 0,  // demo clock: lets the pitch jump ahead in time
    };
  }
  function spotId(type, n) { return `${TYPES[type].prefix}-${String(n).padStart(TYPES[type].pad, '0')}`; }

  function load() { const raw = storage.getItem(KEY); return raw ? JSON.parse(raw) : seed(); }
  function save(db) { storage.setItem(KEY, JSON.stringify(db)); }
  function reset() { const db = seed(); save(db); return db; }

  // Re-read the saved data right before every change. Another tab may have changed it since
  // this page loaded; without this, the older copy would overwrite the newer bookings.
  function refresh(db) { return Object.assign(db, load()); }

  // --- Time ---
  function now(db) { return Date.now() + db.clockOffsetMs; }
  function advanceClock(db, hours) { refresh(db); db.clockOffsetMs += hours * HOUR; save(db); }
  function startOfDay(ms) { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
  function nextDay(ms) { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); }
  function lastBookableDay(db) { let d = startOfDay(now(db)); for (let i = 0; i < DAYS_AHEAD; i++) d = nextDay(d); return d; }

  // Days a driver can pick: today and the next 7 calendar days.
  function bookingDays(db) {
    const days = [];
    for (let d = startOfDay(now(db)); d <= lastBookableDay(db); d = nextDay(d)) days.push(d);
    return days;
  }

  // When a booking starts: 08:00, or right now if booking today after 08:00
  // (otherwise a same-day booking after 10:00 would be released at once).
  function startFor(db, day) { return Math.max(day + DAY_START_HOUR * HOUR, now(db)); }
  function releaseDeadline(r) { return r.start + RELEASE_AFTER_HOURS * HOUR; }

  // --- Reservations ---
  function isActive(r) { return ['reserved', 'checked-in', 'blocked'].includes(r.status); }
  function onDay(db, day) { return db.reservations.filter((r) => isActive(r) && r.from === startOfDay(day)); }

  // Free spots of one type on the day of the given time (first come, first served).
  function freeSpots(db, type, start) {
    const taken = new Set(onDay(db, start).map((r) => r.spotId));
    return db.spots.filter((s) => s.type === type && !taken.has(s.id));
  }

  // The one place where a spot gets taken. Checks and saves in one step on fresh data.
  function take(db, driver, id, start, status) {
    refresh(db);
    releaseExpired(db);
    const spot = db.spots.find((s) => s.id === id);
    if (!spot) throw new Error('This spot does not exist.');
    if (status !== 'blocked' && start + RELEASE_AFTER_HOURS * HOUR <= now(db)) throw new Error('This time is already past.');
    if (startOfDay(start) > lastBookableDay(db)) throw new Error(`You can book up to ${DAYS_AHEAD} days ahead.`);
    if (!freeSpots(db, spot.type, start).some((s) => s.id === id)) throw new Error('Sorry, this spot was just taken. Pick another one.');
    const r = { id: db.nextId++, driver, spotId: id, type: spot.type, start, from: startOfDay(start), to: nextDay(start), status };
    db.reservations.push(r);
    rememberName(db, driver);
    save(db);
    return r;
  }
  function reserve(db, driver, id, start) {
    const name = String(driver || '').trim();
    if (!name) throw new Error('Enter your name.');
    return take(db, name, id, start, 'reserved');
  }

  // Spec: drivers can cancel their own reservation; it frees the spot and is not a no-show.
  function cancel(db, id, driver) {
    refresh(db);
    const r = db.reservations.find((x) => x.id === id);
    if (!r || r.driver !== driver || r.status !== 'reserved') throw new Error('This reservation cannot be cancelled.');
    r.status = 'cancelled';
    save(db);
    return r;
  }

  // Release reservations not checked in within 2 hours of their start (they count as no-shows).
  function releaseExpired(db) {
    refresh(db);
    let count = 0;
    for (const r of db.reservations) {
      if (r.status === 'reserved' && now(db) > releaseDeadline(r)) { r.status = 'released'; count++; }
    }
    if (count) save(db);
    return count;
  }

  // Check-in is possible from the start of the reservation's day until the release deadline.
  function canCheckIn(db, r) {
    return r.status === 'reserved' && now(db) >= r.from && now(db) <= releaseDeadline(r);
  }
  function checkIn(db, id) {
    releaseExpired(db);
    const r = db.reservations.find((x) => x.id === id);
    if (!r || !canCheckIn(db, r)) throw new Error('Check-in is not possible for this reservation.');
    r.status = 'checked-in';
    save(db);
    return r;
  }

  function reservationsOf(db, driver) {
    return db.reservations.filter((r) => r.driver === driver).sort((a, b) => b.start - a.start);
  }
  function noShows(db, driver) { return db.reservations.filter((r) => r.driver === driver && r.status === 'released').length; }
  function showNoShowWarning(db, driver) { return noShows(db, driver) >= NO_SHOW_WARNING_AT; }
  function dismissNoShow(db) { refresh(db); db.noShowSeen = true; save(db); }

  // Status of a spot on a day, for the admin table: free, reserved, checked-in or blocked.
  function statusOn(db, id, day) {
    const rs = onDay(db, day).filter((r) => r.spotId === id);
    for (const s of ['blocked', 'checked-in', 'reserved']) if (rs.some((r) => r.status === s)) return s;
    return 'free';
  }
  function bookingOn(db, id, day) { return onDay(db, day).find((r) => r.spotId === id) || null; }

  // --- Driver sign-in: name only. No driver list to manage (out of scope in Spec.md). ---
  function findDriver(db, name) {
    const n = String(name || '').trim().toLowerCase();
    return db.drivers.find((d) => d.toLowerCase() === n) || null;
  }
  function rememberName(db, name) { if (name !== BLOCKED && !findDriver(db, name)) db.drivers.push(name); }
  function signIn(db, name) {
    refresh(db);
    const typed = String(name || '').trim();
    if (!typed) throw new Error('Enter your name.');
    const d = findDriver(db, typed) || typed;
    rememberName(db, d);
    db.currentDriver = d;
    db.noShowSeen = false;
    save(db);
    return d;
  }
  function signOut(db) { refresh(db); db.currentDriver = null; save(db); }

  // --- Admin sign-on and functions ---
  function adminSignIn(db, user, password) {
    refresh(db);
    if (user !== DEMO_ADMIN.user || password !== DEMO_ADMIN.password) throw new Error('Wrong admin name or password.');
    db.adminSignedIn = true;
    save(db);
  }
  function adminSignOut(db) { refresh(db); db.adminSignedIn = false; save(db); }
  function isAdmin(db) { return db.adminSignedIn === true; }
  function needAdmin(db) { refresh(db); if (!isAdmin(db)) throw new Error('Admin sign-on needed.'); }

  // Next free number for a type, e.g. "C-41" (shown as the placeholder in the admin form).
  function nextSpotId(db, type) {
    const numbers = db.spots.filter((s) => s.type === type).map((s) => Number(s.id.split('-')[1]));
    return spotId(type, Math.max(0, ...numbers) + 1);
  }
  function addSpot(db, type, id) {
    needAdmin(db);
    const newId = String(id || '').trim().toUpperCase() || nextSpotId(db, type);
    if (db.spots.some((s) => s.id === newId)) throw new Error(`Spot ${newId} already exists.`);
    const s = { id: newId, type };
    db.spots.push(s);
    save(db);
    return s;
  }
  function removeSpot(db, id) { needAdmin(db); db.spots = db.spots.filter((s) => s.id !== id); save(db); }
  // Spec: block a spot for a day (construction, problems). Drivers see it as booked.
  function blockSpot(db, id, day) { needAdmin(db); return take(db, BLOCKED, id, day + DAY_START_HOUR * HOUR, 'blocked'); }
  // Spec: reserve on behalf of someone else (admin enters a name).
  function reserveFor(db, name, id, day) { needAdmin(db); return reserve(db, name, id, startFor(db, day)); }

  // --- Demo: simulate 10 people booking at once ---
  // People 1-3 all tap the same car spot at the same moment (each has their own copy of the
  // screen): one gets it, the others are told it was just taken and pick the next free spot.
  // Then 4 more cars, 1 motorcycle, 1 EV charger, 1 bicycle, all today. Some drivers check in.
  function simulate(db) {
    refresh(db);
    const day = bookingDays(db)[0];
    const start = startFor(db, day);
    const plan = ['car', 'car', 'car', 'car', 'car', 'car', 'car', 'motorcycle', 'ev', 'bicycle'];
    const sameSpot = (freeSpots(db, 'car', start)[0] || {}).id;
    const tabs = SAMPLE_NAMES.map(() => load()); // people 1-3 opened the app before anyone booked
    const log = [];

    SAMPLE_NAMES.forEach((person, i) => {
      const type = plan[i];
      // People 4-10 open the app later, so they see the latest free spots.
      const want = i < 3 ? sameSpot : (freeSpots(load(), type, start)[0] || {}).id;
      try {
        const r = reserve(tabs[i], person, want, start);
        log.push(`${person} booked ${r.spotId} (${TYPES[type].label})`);
      } catch (err) {
        const next = (freeSpots(load(), type, start)[0] || {}).id;
        if (!next) { log.push(`${person} tried ${want}: no free ${TYPES[type].label.toLowerCase()} spot left`); return; }
        reserve(tabs[i], person, next, start);
        log.push(`${person} tried ${want}: it was just taken, booked ${next} instead`);
      }
    });

    // Some drivers arrive and check in, so the admin table shows every status.
    refresh(db);
    for (const r of db.reservations.filter((x) => SAMPLE_NAMES.indexOf(x.driver) % 2 === 0)) {
      if (canCheckIn(db, r)) { checkIn(db, r.id); log.push(`${r.driver} checked in at ${r.spotId}`); }
    }
    return log;
  }

  const Store = {
    TYPES, HOUR, RELEASE_AFTER_HOURS, NO_SHOW_WARNING_AT, DAYS_AHEAD, DEMO_ADMIN, BLOCKED,
    useStorage, load, save, reset, now, advanceClock, startOfDay, bookingDays, startFor,
    freeSpots, reserve, cancel, releaseExpired, canCheckIn, checkIn, releaseDeadline,
    reservationsOf, noShows, showNoShowWarning, dismissNoShow, statusOn, bookingOn,
    findDriver, signIn, signOut, adminSignIn, adminSignOut, isAdmin,
    nextSpotId, addSpot, removeSpot, blockSpot, reserveFor, simulate,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Store;
  else root.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);
