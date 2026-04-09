# JDWoMoviex Cinema Backend Integration Test Checklist

This checklist is for repeatable end-to-end verification of the cinema booking lifecycle with seeded demo data.

## 0) Environment setup

- Ensure MongoDB is running.
- Enable demo seed data (default):
  - `APP_SEED_CINEMA_DEMO_ENABLED=true`
- Start backend.
- Log in as a test user and capture JWT token.

## 1) Verify seed data is ready

- `GET /api/cinema/cinemas` => expect at least 2 branches (demo seeds 3).
- `GET /api/cinema/auditoriums?cinemaId=cinema-hcm-01` => expect 2 to 3 auditoriums.
- `GET /api/cinema/showtimes/view` => expect multiple showtimes across Monday to Sunday.
- `GET /api/cinema/showtimes/st-001-1810/seats` => expect full seat layout (A-H, 1-12).

## 2) Booking creation + seat reservation

- Pick a `showtimeId` and 2 available seats from `/api/cinema/showtimes/{id}/seats`.
- Call `POST /api/cinema/bookings` with selected seats.
- Expect:
  - `bookingStatus = PENDING`
  - `paymentStatus = PENDING`
  - Reservation expiry timestamp is set.
- Re-check `GET /api/cinema/showtimes/{id}/seats`.
- Expect selected seats to be `RESERVED`.

## 3) Double-booking protection

- As same or different user, try creating another booking for the same showtime and same seats.
- Expect request to fail (conflict/bad request) and no second sale.

## 4) Sandbox payment success path

- `POST /api/cinema/payments` for the pending booking.
- Capture `txnCode`.
- Confirm success:
  - `POST /api/cinema/payments/confirm?txnCode={txnCode}&success=true`
- Expect:
  - booking becomes `CONFIRMED`
  - payment becomes `PAID`
  - seats become `BOOKED`
  - ticket record is generated.
- Validate ticket:
  - `GET /api/cinema/tickets`
  - `GET /api/cinema/tickets/code/{ticketCode}`

## 5) Sandbox payment failure path

- Create another pending booking with different seats.
- Create sandbox payment transaction.
- Confirm failure:
  - `POST /api/cinema/payments/confirm?txnCode={txnCode}&success=false`
- Expect:
  - booking becomes `FAILED` or `CANCELLED`/`EXPIRED` (according to flow)
  - payment becomes `FAILED` or `CANCELLED`
  - seats are released back to `AVAILABLE`
  - no successful ticket is issued for failed booking.

## 6) Seat release on timeout

- Create a pending booking and do not confirm payment.
- Wait for hold expiry (`cinema.booking.hold-minutes`, default 10) or trigger cleanup flow.
- Expect:
  - booking is moved out of active pending state
  - seats return to `AVAILABLE`.

## 7) Booking/ticket history consistency

- `GET /api/cinema/bookings` should include the user bookings.
- `GET /api/cinema/tickets/my?segment=all` should segment correctly:
  - `upcoming`
  - `history`
  - `cancelled`
- Admin cross-check:
  - `GET /api/admin/cinema/bookings`
  - `GET /api/admin/cinema/payments`
  - `GET /api/admin/cinema/tickets`

## Pass criteria summary

- No seat can be sold twice for one showtime.
- Seat state transitions are correct (`AVAILABLE -> RESERVED -> BOOKED` or release on failure/timeout).
- Payment outcomes are reflected consistently in booking and ticket data.
- Ticket generation occurs only after successful payment confirmation.
