# Parking App - Build Plan (draft v0.2)

Status: draft. Based on `Spec.md` (draft 1) and on common product and software practices.
Reviewed again once the spec's open questions are answered. Items marked **(to confirm)**
are assumptions, not decisions.

## 1. Approach
- **Visual first.** Build a clickable prototype with fake data before any backend.
  Seeing and clicking through screens is the cheapest way to find what is wrong with an idea.
- **Draft, not finished.** Only what `Spec.md` lists for the first release.
- **Web first, mobile-friendly**, as the spec says. One responsive web app that works on a phone
  browser. Mobile is a later phase (section 5).
- **Small steps with checks.** Every phase below ends with a "done when" check.

## 2. Phases

| # | Phase | Mindset | Output | Done when | Status |
|---|-------|---------|--------|-----------|--------|
| 0 | Align on the problem | PM | `Spec.md` users, scope, inventory | All three of us agree | Draft 1 written; open questions remain |
| 1 | Define the MVP | PM | One GitHub Issue per screen in section 4, with acceptance criteria from `Spec.md` | Every MVP screen is an Issue with a clear "done" | Not started |
| 2 | Map the flows | PM + design | A user-flow diagram and rough wireframes (boxes, no colors) for every screen | Each flow is a sequence of screens we reviewed together | Not started |
| 3 | Clickable prototype | Developer | Web app with fake data, mobile layout first, published online (e.g. GitHub Pages, free) | Someone outside the team can click through every flow on a phone and a laptop | All 6 screens built in `mockup/` and tested on phone and desktop size; not published yet |
| 4 | Feedback round | PM | Notes from 3-5 people trying the prototype | Top changes are logged as Issues and the spec is updated | Not started |
| 5 | First working version | Developer | Real data and rules (reservations, 2-hour release, no-show count) | A driver can reserve and check in for real | Rules work in the mockup with browser storage (11 tests pass); shared backend not started |
| 6 | Mobile decision | PM + developer | Choice: stay web / installable web app (PWA) / native app | Decision recorded in `Spec.md` with the reason | Later phase |
| 7 | Observability **(to confirm, question 1)** | Developer | Dynatrace monitoring on the app (it supports web and mobile apps) | We can see real user sessions in Dynatrace | Not started |

Phases 0-4 are the "first good draft". Phases 5-7 come after the plan review.

**Today: a working app to pitch.** Phases 1, 3 and 5 squeeze into one day; the sketches (phase 2)
are quick ones inside each Issue, and the feedback round (phase 4) happens after the pitch.
Done today when, from the published link, someone can: sign in by name, see free spots, reserve,
get a spot number, check in or cancel, and an admin (after sign-on) can add, remove and block spots
and book for someone. **Status: done and live** (link in README).
The 2-hour release and the no-show warning can't be waited for live, so the mockup has a
demo bar at the bottom of every page (+1 hour, +1 day, simulate 10 people, reset demo).

Mockup choices where `Spec.md` doesn't say (change them when the spec answers):
- All spot types are booked per day, starting 08:00 (check in by 10:00). Booked later on the same day,
  the booking starts at that moment, so it isn't released straight away.
- "Up to 7 calendar days ahead" = today plus the next 7 days (8 days to pick from).
- Drivers can cancel only before checking in. Admins have no "unblock" (not in the spec).
- Any name can sign in (managing drivers is out of scope); the same name always means the same person.
- **Admin sign-on is for show only.** The demo account is in `README.md` and readable in the page
  code, because the site is public and has no server. Real admin accounts need phase 5.

**Spec gap for the real version:** "other users will see that spot as BOOKED" needs bookings shared
between devices, so a server and database (phase 5). The mockup shares bookings only inside one browser.

## Two people booking the same spot at the same time
- **Seeing what's booked:** drivers see booked spots greyed out and "N of 40 free"; the admin table shows
  each spot as Free / Reserved / Checked in / Blocked for the chosen day, with who booked it.
- **Mockup (now):** before every booking the app re-reads the saved data, so a second tab can't overwrite
  a booking ("Sorry, this spot was just taken"). Tested in `tests/store.test.js`. Data is still per device.
- **Real version (phase 5):** the server is the only source of truth and books with one atomic step
  (e.g. a database rule: one active booking per spot and time). The second request gets "spot just taken",
  the app refreshes the grid and the driver picks another spot. Refresh the grid regularly so taken spots
  show up without reloading.

## 3. Working at the same time (3 people)
- Split work **by screen**, one Issue each, so people rarely edit the same files.
- Build the **shared parts first** (layout, navigation, fake data for the 53 spots) in one small PR.
  Everyone else builds screens on top of them. This avoids most merge conflicts.
- Short PRs (one Issue each), merged often. Pull `main` before starting each task.
- One person owns the spec decisions (PM role) to avoid endless debate. **(to confirm who)**

## 4. MVP screens (derived from `Spec.md`)
Each screen maps to a section of the spec. Look and feel: `Garage Parking App Prototype.html`.

Driver:
1. **Sign in** - enter a name, no password.
2. **Find a spot** - pick spot type (car, motorcycle, EV charger, bicycle) and day (up to 7 days ahead),
   see free and booked spots; no-show reminder after 3 no-shows.
3. **Your reservation** - spot number, check in, cancel; "You're checked in" screen.
4. **My reservations** - your own reservations, with cancel.

Admin:
5. **Spots** - view status per day; after admin sign-on: add, remove and block spots, book for someone.

Out of scope (Spec.md exclusions): SSO, managing admin accounts, adding or removing drivers, payments.

Rules shown with fake data in the mockup, built for real in phase 5:
first come first served, release after 2 hours without check-in, no-show count, cancel.

## 5. Decisions to make (with a recommendation)

| Decision | Options | Recommendation | Why |
|----------|---------|----------------|-----|
| Prototype tool | Design tool (e.g. Figma) / coded prototype / no-code tool | Coded prototype | Claude can build it, it becomes the base of the real app, and Dynatrace can monitor a real web page |
| Web tech | Plain HTML/CSS/JS / a framework such as React | Plain HTML/CSS/JS, one file per screen, no build step | Built in one day by three beginners: nothing to install, publishes straight to GitHub Pages, one file per screen keeps people out of each other's files. Revisit React in phase 5 if the app grows |
| Data storage (pitch) | Browser storage / backend + database | Browser storage (localStorage) | One device is enough for the pitch; no server, no cost |
| Mobile (later phase) | Responsive web / PWA (installable web app) / native (iOS, Android) / cross-platform (React Native, Flutter) | Responsive web first, PWA next | One codebase. Go native only if we need things the web can't do well, or app-store presence |
| Hosting for the prototype | GitHub Pages / other free hosts | GitHub Pages | Free, already where the code is |

## 6. Risks
- **One-day timeline for a working app.** The biggest risk. Fix: six screens only, no extra
  features, data saved in the browser (no server), polish after the pitch.
- **Browser storage limits.** Data lives on one device and one browser; clearing the browser
  erases it, and two people can't see each other's bookings. Fine for the pitch; a shared
  backend is phase 5.
- **Name-only sign-in.** Anyone can type any name, including an admin's. Acceptable for a
  prototype with fake data, not for real use. Already in the spec's open questions.
- **Scope grows** ("one more feature"). Fix: the spec's "anything not listed is out" rule.
- **Merge conflicts** from three people plus three Claudes. Fix: section 3 rules.
- **Secrets in a public repo** once real services are connected. Fix: `.env`, never commit tokens.

## 7. Open questions for the plan (answer one at a time)
The product questions (booking window, bicycles, EV rules, no-shows, sign-in) are in `Spec.md`.
1. Is monitoring the app with Dynatrace a goal of the workshop (phase 7), or only the name?
2. Who owns the spec decisions (PM role)?
3. Roughly how many hours a week can each of us spend?

Answered: app type is corporate parking (one shared garage, shared pool, first come first served);
the first release is for both drivers and admins; "launch today" means a working app to pitch today;
for the pitch one device is enough, so data is saved in the browser and there is no server.
