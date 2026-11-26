// ui.js - shared pieces for every screen: header, admin sidebar, icons, dates, demo controls.
const UI = (() => {
  // Make user-typed text (names) safe to put inside HTML.
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const day = (ms) => new Date(ms).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const when = (r) => (Store.TYPES[r.type].unit === 'day' ? 'All day' : `${time(r.from)}-${time(r.to)}`);

  // Simple line icons for the vehicle cards.
  const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const ICONS = {
    car: svg('<path d="M5 16v-5l2-5h10l2 5v5"/><path d="M3 11h18v6H3z"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>'),
    motorcycle: svg('<circle cx="5" cy="16" r="3"/><circle cx="19" cy="16" r="3"/><path d="M5 16l5-6h4l5 6M8 10h3"/>'),
    ev: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  };

  // Demo controls: jump the clock ahead to show the 2-hour release, or start over.
  function demo(db, into) {
    into.insertAdjacentHTML('beforeend',
      `<footer class="demo"><span>Demo clock: <strong>${day(Store.now(db))} ${time(Store.now(db))}</strong></span>
       <button type="button" data-hours="1">+1 hour</button><button type="button" data-hours="24">+1 day</button>
       <button type="button" data-simulate>Simulate 10 people</button>
       <button type="button" data-reset>Reset demo</button></footer>`);
    into.querySelectorAll('[data-hours]').forEach((b) =>
      b.addEventListener('click', () => { Store.advanceClock(db, Number(b.dataset.hours)); location.reload(); }));
    into.querySelector('[data-reset]').addEventListener('click', () => { Store.reset(); location.href = 'index.html'; });
    // Simulate: book for 10 people, then reload and show what happened in a pop-up.
    into.querySelector('[data-simulate]').addEventListener('click', () => {
      sessionStorage.setItem('simLog', JSON.stringify(Store.simulate(db)));
      location.reload();
    });
    const log = JSON.parse(sessionStorage.getItem('simLog') || 'null');
    if (log) {
      sessionStorage.removeItem('simLog');
      document.body.insertAdjacentHTML('beforeend', `<div class="overlay" id="simModal"><div class="modal" role="dialog" aria-modal="true">
        <h2>10 people just booked</h2><ul class="sim-log">${log.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <button class="btn" type="button" id="simClose">Close</button></div></div>`);
      document.getElementById('simClose').addEventListener('click', () => document.getElementById('simModal').remove());
    }
  }

  // Driver screens: greeting header, tabs, demo bar. Sends you to sign-in if nobody is signed in.
  function driver(title) {
    const db = Store.load();
    Store.releaseExpired(db);
    if (!db.currentDriver) { location.replace('index.html'); return null; }
    const phone = document.querySelector('.phone');
    const page = location.pathname.split('/').pop();
    const tab = (href, text) => `<a href="${href}"${page === href ? ' aria-current="page"' : ''}>${text}</a>`;
    phone.insertAdjacentHTML('afterbegin',
      `<header class="app-head"><div><p class="hello">Hi, ${esc(db.currentDriver)}</p><h1>${title}</h1></div>
       <button class="avatar" type="button" id="signout" title="Sign out">${esc(db.currentDriver[0])}</button></header>
       <nav class="tabs">${tab('find.html', 'Find a spot')}${tab('reservation.html', 'My reservations')}</nav>`);
    document.getElementById('signout').addEventListener('click', () => { Store.signOut(db); location.href = 'index.html'; });
    demo(db, phone);
    return db;
  }

  // Admin screens: sidebar with Spots / Drivers.
  function admin() {
    const db = Store.load();
    Store.releaseExpired(db);
    const page = location.pathname.split('/').pop();
    const link = (href, text) => `<a href="${href}"${page === href ? ' aria-current="page"' : ''}>${text}</a>`;
    document.querySelector('.side').innerHTML =
      `<a class="logo" href="admin-spots.html"><i>P</i><span>Garage Parking<small>Building admin</small></span></a>
       <nav>${link('admin-spots.html', 'Spots')}${link('admin-drivers.html', 'Drivers')}<a href="index.html">Driver app</a></nav>`;
    demo(db, document.querySelector('.admin'));
    return db;
  }

  return { esc, day, time, when, ICONS, demo, driver, admin };
})();
