# Parking App - Build Plan (draft v0.1)

Status: first draft. Based on `docs/SPEC.md`, which is still mostly TBD, and on common
product and software practices. Nothing here is decided until we review it together
once the spec is complete. Items marked **(to confirm)** are assumptions, not decisions.

## 1. Approach
- **Visual first.** Build a clickable prototype with fake data before any backend.
  Seeing and clicking through screens is the cheapest way to find what is wrong with an idea.
- **Draft, not finished.** Aim for the smallest version that shows the main user flows (an MVP).
- **Web first, mobile-friendly.** One responsive web app that works on a phone browser.
  Decide on a native mobile app later, with the criteria in section 5.
- **Small steps with checks.** Every phase below ends with a "done when" check.

## 2. Phases

| # | Phase | Mindset | Output | Done when |
|---|-------|---------|--------|-----------|
| 0 | Align on the problem | PM | `SPEC.md` Goal, Users, Out of scope filled in | All three of us agree in one PR |
| 1 | Define the MVP | PM | User stories ("As a ... I want ... so that ...") ordered by priority; top 3-5 become GitHub Issues with acceptance criteria | Each MVP feature is one Issue with a clear "done" |
| 2 | Map the flows | PM + design | A user-flow diagram and rough wireframes (boxes, no colors) for every MVP screen | Each flow is a sequence of screens we reviewed together |
| 3 | Clickable prototype | Developer | Web app with fake data, mobile layout first, published online (e.g. GitHub Pages, free) | Someone outside the team can click through every MVP flow on a phone and a laptop |
| 4 | Feedback round | PM | Notes from 3-5 people trying the prototype | Top changes are logged as Issues and the spec is updated |
| 5 | First working version | Developer | Real data and logic for one flow at a time (backend, database if needed) | The most important flow works end to end |
| 6 | Mobile decision | PM + developer | Choice: stay web / installable web app (PWA) / native app | Decision recorded in `SPEC.md` with the reason |
| 7 | Observability **(to confirm, question 3)** | Developer | Dynatrace monitoring on the app (it supports web and mobile apps) | We can see real user sessions in Dynatrace |

Phases 0-4 are the "first good draft". Phases 5-7 come after the plan review.

## 3. Working at the same time (3 people)
- Split work **by screen or flow**, one Issue each, so people rarely edit the same files.
- Build the **shared parts first** (layout, navigation, buttons, fake data file) in one small PR.
  Everyone else builds screens on top of them. This avoids most merge conflicts.
- Short PRs (one Issue each), merged often. Pull `main` before starting each task.
- One person owns the spec decisions (PM role) to avoid endless debate. **(to confirm who)**

## 4. Features: candidates only
App type: **corporate parking**. Common in corporate parking and workplace-booking tools,
listed only to help the discussion. Pick 3-5 for the MVP.

Employee:
- See which spots are free on a given day (list or simple lot map)
- Book a spot for a day, and cancel it
- Release my assigned spot on days I'm not in, so a colleague can use it
- See my upcoming bookings
- Check in on arrival, so unused bookings can be freed (no-show release)

Admin (facility manager):
- Manage parking areas and spots, including special ones (EV charging, accessible, visitor)
- Set booking rules (how far ahead, max days per week, who can book which spots)
- See usage (how full the parking is, no-shows)

Which of these apply depends on open question 2 (assigned spots or a shared pool).

## 5. Decisions to make (with a recommendation)

| Decision | Options | Recommendation | Why |
|----------|---------|----------------|-----|
| Prototype tool | Design tool (e.g. Figma) / coded prototype / no-code tool | Coded prototype | Claude can build it, it becomes the base of the real app, and Dynatrace can monitor a real web page |
| Web tech | Plain HTML/CSS/JS / a framework such as React | React (with a starter tool like Vite) | Splits screens into reusable pieces, very common so lots of learning material, path to React Native for mobile |
| Mobile | Responsive web / PWA (installable web app) / native (iOS, Android) / cross-platform (React Native, Flutter) | Responsive web first, PWA next | One codebase. Go native only if we need things the web can't do well (e.g. background location) or app-store presence |
| Hosting for the prototype | GitHub Pages / other free hosts | GitHub Pages | Free, already where the code is |

## 6. Risks
- **Spec stays vague** and we build the wrong thing. Fix: phase 0 before any code.
- **Scope grows** ("one more feature"). Fix: MVP list is fixed until the feedback round.
- **Merge conflicts** from three people plus three Claudes. Fix: section 3 rules.
- **Secrets in a public repo** once real services are connected. Fix: `.env`, never commit tokens.

## 7. Open questions (answer one at a time)
1. ~~What kind of parking app is it?~~ Answered: corporate parking.
2. Do employees have assigned spots they can release, a shared pool everyone books from, or a mix?
3. Is monitoring the app with Dynatrace a goal of the workshop (phase 7), or only the name?
4. Is there a deadline or workshop date?
5. Who do we design for first: employees or the admin?
6. Roughly how many hours a week can each of us spend?
