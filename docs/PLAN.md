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
get a spot number, check in, and an admin can add or remove spots and drivers.
The 2-hour release and the no-show warning can't be waited for live, so the mockup has a
demo clock at the bottom of every page (+1 hour, +1 day, reset demo data).

Mockup choices where `Spec.md` is still open (change them when the spec answers):
- Cars and motorcycles: the driver picks a day and an arrival time; the spot is held all day.
- EV chargers: one 1-hour slot per booking.
- Check-in opens on the reservation's day. No cancel button (open question in the spec).
- Admin pages are open to everyone (admin sign-in is an open question in the spec).

## Two people booking the same spot at the same time
- **Seeing what's booked:** drivers see taken spots greyed out and "N of 40 free"; the admin table shows
  each spot as Free / Reserved / Checked in today.
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
Each screen maps to a section of the spec. Six screens, two per person.

Driver:
1. **Sign in** - enter a name, no password.
2. **Find a spot** - pick spot type (car, motorcycle, EV charger) and time, see which spots are free.
3. **Reservation confirmed** - shows the spot number.
4. **My reservation** - check in on arrival; shows the no-show warning after 3 no-shows.

Admin:
5. **Spots** - view, add and remove spots by type.
6. **Drivers** - add and remove drivers.

Rules to show with fake data in the prototype, built for real in phase 5:
first come first served, release after 2 hours without check-in, no-show count.

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
