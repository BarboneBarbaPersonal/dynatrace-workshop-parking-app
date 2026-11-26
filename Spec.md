# Spec&#32;

parking app

web first, then mobile&#32;

Interview questions, first round:

1. Who are the users? Drivers booking, lot operators or admins managing spots, or both?
   1. Users are drivers booking a spot (motorcycle, car, or bicycle). Secondary could be building admins who need to inventory the spots available, add/remove drivers.
2. What kind of parking is it (company lot, city garages, private driveways, event venues)? How many locations and spots?
   1. Building underground garage, shared across companies. Includes different types of parking spots for motorcycles, cars, and electric chargers. 40 car spots, 10 moto spots, 3 chargers.
   2. How is availability known: sensors, manual entry, or an existing system to integrate with?
      1. There is no sensor. First come first served. A driver should be able to reserve a spot in advance (up to 1hr, for a specific time) and then check in in the app.&#32;
3. How do bookings work: by the hour, day or month; advance limits; cancellation and no-show rules?
   1. By the day. EV charger should be by hours. No show - reserved spot frees back up if not checked in within 2 hrs of reservation.
4. Are payments in scope? If so, which provider and currencies?
   1. no payments required - employer sponsored free parking. include a reminder/nastygram if someone repeatedly reserves spots and doesn't check in (after 3 no shows)&#32;
5. How do users sign in, and is there a corporate SSO requirement?
   1. reserve a spot, enter your name. no need to build SSO.&#32;
6. What does the driver need on arrival: QR code, gate integration, or a spot number?
   1. spot number
7. What is the launch date, and what is the web-first MVP cut before mobile?
   1. launch date is today

## Parking app spec, draft 1

A web app lets employees of companies sharing one underground garage see free spots and reserve one. Mobile follows after the web version.

## Users

- Drivers: reserve and check in for a motorcycle, car or bicycle spot. They identify themselves by entering a name. No SSO.
- Building admins: maintain the spot inventory and add or remove drivers.

## Inventory

| Spot type | Count | Booking unit |
| --- | --- | --- |
| Car | 40 | Day |
| Motorcycle | 10 | Day |
| EV charger | 3 | Hour |

There are no sensors. Availability is derived only from reservations and check-ins, first come first served. Payments are out of scope (employer-sponsored, free).

## Reservation and check-in

1. The driver picks a spot type and a time, and sees which spots are free.
2. The driver reserves a spot and is shown its spot number.
3. On arrival the driver checks in through the app. The spot number is all that is needed to find the spot.
4. A reservation not checked in within 2 hours of its start is released back to the pool.

## No-show policy

After 3 no-shows by the same driver, the app shows a reminder warning about repeated unused reservations.

## Admin functions

- View, add and remove spots by type.
- Add and remove drivers.

## Scope and launch

Launch is today, web only. Mobile is a later phase. Anything not listed above is out of the first release.

## Open questions

- [ ] Booking is by the day, but the advance window was given as up to 1 hour for a specific time. Which applies to cars and motorcycles?
- [ ] Bicycles were named as a vehicle type, but no bicycle spot count was given. Are there bicycle spots?
- [ ] EV charger: slot length, maximum hours per booking, and whether a charger spot can be used by non-EV cars.
- [ ] The no-show warning needs a contact channel. Names only are collected, so is it shown in-app on next login?
- [ ] Does name-only sign-in need protection against two drivers using the same name, and how are admins authenticated?
- [ ] Do no-show counts reset over time, and can a driver cancel before the 2-hour window?
