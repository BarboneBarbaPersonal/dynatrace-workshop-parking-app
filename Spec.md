# Spec&#32;

## Parking app spec, draft 1

A web app lets employees of companies sharing one underground garage see free spots and reserve one. Mobile follows after the web version.

## Users

- Drivers: reserve and check in for a motorcycle, car or bicycle spot. They identify themselves by entering a name.
- Building admins: maintain the spot inventory after signing in with an admin account.

## Inventory

| Spot type | Count | Booking unit |
| --- | --- | --- |
| Car | 40 | Day |
| Motorcycle | 10 | Day |
| EV charger | 3 | Day |
| Bicycle | 10 | Day |

There are no sensors. Availability is derived only from reservations and check-ins, first come first served. Payments are out of scope (employer-sponsored, free).

## Reservation and check-in

1. The driver picks a spot type and a day, and sees which spots are free.
2. The driver reserves a spot and is shown its spot number.
3. On arrival the driver checks in through the app. The spot number is all that is needed to find the spot.
4. A reservation not checked in within 2 hours of its start is released back to the pool.

Drivers can view their own reservations and cancel one. A cancelled reservation frees the spot and does not count as a no-show.&#32;

Refreshing or accessing the app after reservation should persist the reservation, and other users will see that spot as BOOKED and unavailable to reserve.

Drivers can book any spot up to 7 calendar days ahead.

## No-show policy

After 3 no-shows by the same driver (authenticated user), the app shows a reminder warning about repeated unused reservations.

## Admin functions

- Admin sign-on: attempting to edit spots opens a sign-on window. Nobody can change the number of spots without an admin account.
- View, add and remove spots by type.&#32;
- Block a spot as reserved for the day (if there's construction or problems), or reserve on behalf of someone else (enter a name).&#32;

## Scope and launch

Launch is today, web only. Mobile is a later phase. Anything not listed above is out of the first release.

## Exclusions

Not part of the first release:

- SSO. Drivers enter a name; admins use the separate admin sign-on above.
- Admin user management: creating, adding or removing admin accounts, and adding or removing drivers.
- Payments.
