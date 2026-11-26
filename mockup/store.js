// store.js - all data and rules of the mockup (from Spec.md and the design mockup).
// Works in the browser (as window.Store) and in Node tests (require).
// Data is saved in the browser's localStorage: one device only, as agreed for the pitch.
(function (root) {
  const KEY = 'parking-mockup-v2';
  const HOUR = 60 * 60 * 1000;
  const RELEASE_AFTER_HOURS = 2; // Spec: released if not checked in within 2 hours of start
  const NO_SHOW_WARNING_AT = 3;  // Spec: warning after 3 no-shows
  const DAY_START_HOUR = 8;      // Design: all-day bookings start 08:00 (check in by 10:00)
  const EV_SLOTS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]; // Design: 1-hour EV slots 08:00-17:00

  // Spot types and counts from the Spec.md inventory table; number format from the design.
  const TYPES = {
    car:        { label: 'Car',        count: 40, unit: 'day',  prefix: 'C', pad: 2 },
    motorcycle: { label: 'Motorcycle', count: 10, unit: 'day',  prefix: 'M', pad: 2 },
    ev:         { label: 'EV charger', count: 3,  unit: 'hour', prefix: 'E', pad: 1 },
  };

  // --- Storage: localStorage in the browser, a simple in-memory copy in tests ---
  function memoryStorage() {
    const data = {};
    return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
  }
  let storage = root.localStorage || memoryStorage();
  function useStorage(s) { storage = s; }

  // --- Starting data (fake, for the demo; sample names from the design mockup) ---
  function seed() {
    const spots = [];
    for (const type of Object.keys(TYPES)) {
      for (let i = 1; i <= TYPES[type].count; i++) spots.push({ id: spotId(type, i), type });
    }
    return {
      spots,
      drivers: ['Alex Morgan', 'Priya Shah', 'Jonas Weber', 'Marta Novak', 'Luca Rossi', 'Sam Lee', 'Elena Petrova', 'Tom Becker'],
      reservations: [],
      nextId: 1,
      currentDriver: null,
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

  // Days a driver can pick: today and the next working days (design shows 4, weekends skipped).
  function bookingDays(db, count = 4) {
    const days = [];
    for (let d = startOfDay(now(db)); days.length < count; d = nextDay(d)) {
      const wd = new Date(d).getDay();
      if (wd !== 0 && wd !== 6) days.push(d);
    }
    return days;
  }

  // When a booking starts. All-day: 08:00, or right now if booking today after 08:00
  // (otherwise a same-day booking after 10:00 would be released at once). EV: the chosen slot.
  function startFor(db, type, day, hour) {
    if (TYPES[type].unit === 'day') return Math.max(day + DAY_START_HOUR * HOUR, now(db));
    return day + hour * HOUR;
  }

  // The time a reservation holds its spot: the whole day for cars and motorcycles, one hour for EV.
  function windowOf(type, start) {
    if (TYPES[type].unit === 'day') return { from: startOfDay(start), to: nextDay(start) };
    return { from: start, to: start + HOUR };
  }
  function releaseDeadline(r) { return r.start + RELEASE_AFTER_HOURS * HOUR; }

  // --- Reservations ---
  function isActive(r) { return r.status === 'reserved' || r.status === 'checked-in'; }
  function overlapping(db, from, to) { return db.reservations.filter((r) => isActive(r) && r.from < to && from < r.to); }

  // Free spots of one type for a chosen start time (first come, first served).
  function freeSpots(db, type, start) {
    const w = windowOf(type, start);
    const taken = new Set(overlapping(db, w.from, w.to).map((r) => r.spotId));
    return db.spots.filter((s) => s.type === type && !taken.has(s.id));
  }

  function reserve(db, driver, id, start) {
    refresh(db);
    releaseExpired(db);
    const spot = db.spots.find((s) => s.id === id);
    if (!db.drivers.includes(driver)) throw new Error('Unknown driver.');
    if (!spot) throw new Error('This spot does not exist.');
    if (start + RELEASE_AFTER_HOURS * HOUR <= now(db)) throw new Error('This time is already past.');
    if (!freeSpots(db, spot.type, start).some((s) => s.id === id)) throw new Error('Sorry, this spot was just taken. Pick another one.');
    const w = windowOf(spot.type, start);
    const r = { id: db.nextId++, driver, spotId: id, type: spot.type, start, from: w.from, to: w.to, status: 'reserved' };
    db.reservations.push(r);
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
    return r.status === 'reserved' && now(db) >= startOfDay(r.start) && now(db) <= releaseDeadline(r);
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

  // Status of a spot today, for the admin table: free, reserved or checked-in.
  function statusToday(db, id) {
    const t = now(db);
    const today = overlapping(db, startOfDay(t), nextDay(t)).filter((r) => r.spotId === id);
    if (today.some((r) => r.status === 'checked-in')) return 'checked-in';
    return today.length ? 'reserved' : 'free';
  }

  // --- Drivers and sign-in (name only, no password) ---
  function findDriver(db, name) {
    const n = String(name || '').trim().toLowerCase();
    return db.drivers.find((d) => d.toLowerCase() === n) || null;
  }
  function signIn(db, name) {
    refresh(db);
    const d = findDriver(db, name);
    if (!d) throw new Error('This name is not registered. Ask your building admin to add you.');
    db.currentDriver = d;
    db.noShowSeen = false;
    save(db);
    return d;
  }
  function signOut(db) { refresh(db); db.currentDriver = null; save(db); }

  // --- Admin functions ---
  function addDriver(db, name) {
    refresh(db);
    const n = String(name || '').trim();
    if (!n) throw new Error('Enter a name.');
    if (findDriver(db, n)) throw new Error('This name already exists.');
    db.drivers.push(n);
    save(db);
    return n;
  }
  function removeDriver(db, name) {
    refresh(db);
    db.drivers = db.drivers.filter((d) => d !== name);
    if (db.currentDriver === name) db.currentDriver = null;
    save(db);
  }
  // Next free number for a type, e.g. "C-41" (shown as the placeholder in the admin form).
  function nextSpotId(db, type) {
    const numbers = db.spots.filter((s) => s.type === type).map((s) => Number(s.id.split('-')[1]));
    return spotId(type, Math.max(0, ...numbers) + 1);
  }
  function addSpot(db, type, id) {
    refresh(db);
    const newId = String(id || '').trim().toUpperCase() || nextSpotId(db, type);
    if (db.spots.some((s) => s.id === newId)) throw new Error(`Spot ${newId} already exists.`);
    const s = { id: newId, type };
    db.spots.push(s);
    save(db);
    return s;
  }
  function removeSpot(db, id) { refresh(db); db.spots = db.spots.filter((s) => s.id !== id); save(db); }

  const Store = {
    TYPES, HOUR, RELEASE_AFTER_HOURS, NO_SHOW_WARNING_AT, EV_SLOTS,
    useStorage, load, save, reset, now, advanceClock, startOfDay, bookingDays, startFor,
    freeSpots, reserve, releaseExpired, canCheckIn, checkIn, releaseDeadline,
    reservationsOf, noShows, showNoShowWarning, dismissNoShow, statusToday,
    findDriver, signIn, signOut, addDriver, removeDriver, nextSpotId, addSpot, removeSpot,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Store;
  else root.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);
