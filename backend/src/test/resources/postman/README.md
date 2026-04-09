# JDWoMoviex Cinema Postman Runner Guide

Collection file:
- `JDWoMoviex-Cinema-E2E.postman_collection.json`

## What it verifies

- Login with demo user.
- Seed data exists (cinemas + showtimes).
- Seat reservation on pending booking.
- Anti-double-booking for same seats.
- Payment success flow:
  - `PENDING -> PAID`
  - booking `PENDING -> CONFIRMED`
  - seats become `BOOKED`
  - ticket is generated.
- Payment failure flow:
  - payment `FAILED`
  - booking `CANCELLED`
  - seats released back to `AVAILABLE`.

## How to run

1. Start backend (`http://localhost:8080`) and MongoDB.
2. Ensure cinema seeding is on:
   - `APP_SEED_CINEMA_DEMO_ENABLED=true`
3. Import the collection into Postman.
4. Open collection variables and adjust if needed:
   - `baseUrl`
   - `userEmail`
   - `userPassword`
   - `cinemaId`
   - `preferredShowtimeId`
5. Run the full collection in Collection Runner from request `01` to `16`.

## Notes

- If your seeded showtime `st-001-1810` is unavailable, request `03` auto-falls back to the first available showtime in the selected cinema.
- If previous demo runs already booked many seats, the run still works as long as at least 4 seats remain `AVAILABLE` for success + failure flows.
