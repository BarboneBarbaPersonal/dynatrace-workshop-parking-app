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
| 3 | Clickable prototype | Developer | Web app with fake data, mobile layout first, published online (e.g. GitHub Pages, free) | Someone outside the team can click through every flow on a phone and a laptop | Not started |
| 4 | Feedback round | PM | Notes from 3-5 people trying the prototype | Top changes are logged as Issues and the spec is updated | Not started |
| 5 | First working version | Developer | Real data and rules (reservations, 2-hour release, no-show count) | A driver can reserve and check in for real | Not started |
| 6 | Mobile decision | PM + developer | Choice: stay web / installable web app (PWA) / native app | Decision recorded in `Spec.md` with the reason | Later phase |
| 7 | Observability **(to confirm, question 1)** | Developer | Dynatrace monitoring on the app (it supports web and mobile apps) | We can see real user sessions in Dynatrace | Not started |

Phases 0-4 are the "first good draft". Phases 5-7 come after the plan review.

## 3. Working at the same time (3 people)
- Split work **by screen**, one Issue each, so people rarely edit the same files.
- Build the **shared parts first** (layout, navigation, fake data for the 53 spots) in one small PR.
  Everyone else builds screens on top of them. This avoids most merge conflicts.
- Short PRs (one Issue each), merged often. Pull `main` before starting each task.
- One person owns the spec decisions (PM role) to avoid endless debate. **(to confirm who)**

## 4. MVP screens (derived from `Spec.md`)
Each screen maps to a section of the spec. Six screens, two per person.

Driver:
1. **Sign in** - enter a name (no SSO).
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
| Web tech | Plain HTML/CSS/JS / a framework such as React | React (with a starter tool like Vite) | Splits screens into reusable pieces, very common so lots of learning material, path to React Native for mobile |
| Mobile (later phase) | Responsive web / PWA (installable web app) / native (iOS, Android) / cross-platform (React Native, Flutter) | Responsive web first, PWA next | One codebase. Go native only if we need things the web can't do well, or app-store presence |
| Hosting for the prototype | GitHub Pages / other free hosts | GitHub Pages | Free, already where the code is |

## 6. Risks
- **"Launch is today" (Spec.md) vs this plan's draft-first phases.** If launch means real use
  today, phases 1-4 must shrink to hours. See question 2.
- **Name-only sign-in.** Anyone can type any name, including an admin's. Acceptable for a
  prototype with fake data, not for real use. Already in the spec's open questions.
- **Scope grows** ("one more feature"). Fix: the spec's "anything not listed is out" rule.
- **Merge conflicts** from three people plus three Claudes. Fix: section 3 rules.
- **Secrets in a public repo** once real services are connected. Fix: `.env`, never commit tokens.

## 7. Open questions for the plan (answer one at a time)
The product questions (booking window, bicycles, EV rules, no-shows, sign-in) are in `Spec.md`.
1. Is monitoring the app with Dynatrace a goal of the workshop (phase 7), or only the name?
2. What does "launch today" mean: a clickable draft to show today, or a working app people use?
3. Who owns the spec decisions (PM role)?
4. Roughly how many hours a week can each of us spend?

Answered: app type is corporate parking (one shared garage, shared pool, first come first served);
the first release is for both drivers and admins.
