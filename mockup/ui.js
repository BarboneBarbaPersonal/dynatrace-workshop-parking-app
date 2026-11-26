// ui.js - shared pieces for every screen: header, admin sidebar, pop-ups, icons, dates, demo controls.
const UI = (() => {
  // Make user-typed text (names) safe to put inside HTML.
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const day = (ms) => new Date(ms).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const LABELS = { free: 'Free', reserved: 'Reserved', 'checked-in': 'Checked in', blocked: 'Blocked',
    released: 'Released (not used)', cancelled: 'Cancelled' };

  // Simple line icons for the vehicle cards.
  const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const ICONS = {
    car: svg('<path d="M5 16v-5l2-5h10l2 5v5"/><path d="M3 11h18v6H3z"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>'),
    motorcycle: svg('<circle cx="5" cy="16" r="3"/><circle cx="19" cy="16" r="3"/><path d="M5 16l5-6h4l5 6M8 10h3"/>'),
    ev: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
    bicycle: svg('<circle cx="5.5" cy="16" r="3.5"/><circle cx="18.5" cy="16" r="3.5"/><path d="M5.5 16 9 9h6l3.5 7M9 9 12 16l3-7M8 6h3"/>'),
  };

  // A pop-up window. Returns the box so the caller can fill in and wire up its buttons.
  function modal(html) {
    document.body.insertAdjacentHTML('beforeend', `<div class="overlay"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`);
    const overlay = document.body.lastElementChild;
    overlay.close = () => overlay.remove();
    overlay.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', overlay.close));
    return overlay;
  }

  // Demo controls: jump the clock ahead, simulate 10 people, or start over.
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
      modal(`<h2>10 people just booked</h2><ul class="sim-log">${log.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <button class="btn" type="button" data-close>Close</button>`);
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

  // Admin screens: sidebar. Viewing is open; changing anything asks for admin sign-on first.
  function side(db) {
    document.querySelector('.side').innerHTML =
      `<a class="logo" href="admin-spots.html"><i>P</i><span>Garage Parking<small>Building admin</small></span></a>
       <nav><a href="admin-spots.html" aria-current="page">Spots</a><a href="index.html">Driver app</a>
       ${Store.isAdmin(db) ? '<button class="side-link" type="button" id="adminOut">Admin sign out</button>' : ''}</nav>`;
    const out = document.getElementById('adminOut');
    if (out) out.addEventListener('click', () => { Store.adminSignOut(db); side(db); });
  }
  function admin() {
    const db = Store.load();
    Store.releaseExpired(db);
    side(db);
    demo(db, document.querySelector('.admin'));
    return db;
  }

  // Run an admin action; if nobody is signed in as admin, show the sign-on window first.
  function asAdmin(db, action) {
    if (Store.isAdmin(db)) return action();
    const m = modal(`<h2>Admin sign-on</h2><p>Only building admins can change spots.</p>
      <form id="adminForm"><label class="field">Admin name <input type="text" id="adminUser" autocomplete="username" required></label>
      <label class="field">Password <input type="password" id="adminPass" autocomplete="current-password" required></label>
      <p class="error" id="adminError" role="alert"></p>
      <div class="stack"><button class="btn" type="submit">Sign in</button><button class="btn ghost" type="button" data-close>Cancel</button></div></form>`);
    m.querySelector('#adminUser').focus();
    m.querySelector('#adminForm').addEventListener('submit', (e) => {
      e.preventDefault();
      try { Store.adminSignIn(db, m.querySelector('#adminUser').value.trim(), m.querySelector('#adminPass').value); }
      catch (err) { m.querySelector('#adminError').textContent = err.message; return; }
      m.close();
      side(db); // show the admin sign-out button
      action(); // the action redraws the page and shows its own errors
    });
  }

  return { esc, day, time, LABELS, ICONS, modal, demo, driver, admin, asAdmin };
})();
