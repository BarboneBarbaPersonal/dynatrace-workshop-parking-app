# Spec&#32;

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

