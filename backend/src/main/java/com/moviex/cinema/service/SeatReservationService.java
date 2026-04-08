package com.moviex.cinema.service;

import com.moviex.cinema.model.Booking;
import com.moviex.cinema.model.BookingSeat;
import com.moviex.cinema.model.SeatReservation;
import com.moviex.cinema.model.SeatReservationState;
import com.moviex.cinema.repository.SeatReservationRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SeatReservationService {
    private final SeatReservationRepository seatReservationRepository;

    public SeatReservationService(SeatReservationRepository seatReservationRepository) {
        this.seatReservationRepository = seatReservationRepository;
    }

    public void reserveSeatsForBooking(Booking booking) {
        releaseExpiredReservations();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime holdExpiry = booking.getHoldExpiresAt();
        if (holdExpiry == null || holdExpiry.isBefore(now)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking hold expired");
        }

        List<SeatReservation> inserted = new java.util.ArrayList<>();
        try {
            for (BookingSeat seat : booking.getSeats()) {
                SeatReservation reservation = new SeatReservation();
                reservation.setShowtimeId(booking.getShowtimeId());
                reservation.setBookingId(booking.getId());
                reservation.setSeatId(seat.getSeatId());
                reservation.setState(SeatReservationState.RESERVED);
                reservation.setExpiresAt(holdExpiry);
                reservation.setCreatedAt(now);
                reservation.setUpdatedAt(now);
                inserted.add(seatReservationRepository.save(reservation));
            }
        } catch (DuplicateKeyException ex) {
            rollbackReservations(booking.getId(), inserted);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "One or more seats are already reserved or booked");
        }
    }

    public void releaseReservedSeats(Booking booking) {
        seatReservationRepository.deleteByBookingIdAndState(booking.getId(), SeatReservationState.RESERVED);
    }

    public void confirmReservedSeats(Booking booking) {
        releaseExpiredReservations();
        LocalDateTime now = LocalDateTime.now();
        List<SeatReservation> reservations = seatReservationRepository.findByBookingIdAndState(
                booking.getId(),
                SeatReservationState.RESERVED
        );
        Set<String> reservedIds = reservations.stream()
                .map(SeatReservation::getSeatId)
                .collect(Collectors.toSet());
        Set<String> requestedIds = booking.getSeats().stream()
                .map(BookingSeat::getSeatId)
                .collect(Collectors.toSet());

        if (!reservedIds.containsAll(requestedIds) || reservedIds.size() != requestedIds.size()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Seat reservation is no longer valid");
        }

        reservations.forEach(reservation -> {
            if (reservation.getExpiresAt() == null || reservation.getExpiresAt().isBefore(now)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Seat reservation expired");
            }
            reservation.setState(SeatReservationState.BOOKED);
            reservation.setExpiresAt(null);
            reservation.setUpdatedAt(now);
        });
        seatReservationRepository.saveAll(reservations);
    }

    public boolean hasActiveReservation(String bookingId) {
        releaseExpiredReservations();
        return seatReservationRepository.existsByBookingIdAndState(bookingId, SeatReservationState.RESERVED);
    }

    public void releaseExpiredReservations() {
        seatReservationRepository.deleteByStateAndExpiresAtBefore(SeatReservationState.RESERVED, LocalDateTime.now());
    }

    public List<SeatReservation> listShowtimeReservations(String showtimeId) {
        releaseExpiredReservations();
        return seatReservationRepository.findByShowtimeId(showtimeId);
    }

    private void rollbackReservations(String bookingId, List<SeatReservation> inserted) {
        if (!inserted.isEmpty()) {
            List<String> ids = inserted.stream().map(SeatReservation::getId).toList();
            seatReservationRepository.deleteAllById(ids);
        } else {
            seatReservationRepository.deleteByBookingIdAndState(bookingId, SeatReservationState.RESERVED);
        }
    }
}
