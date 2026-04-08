package com.moviex.cinema.repository;

import com.moviex.cinema.model.SeatReservation;
import com.moviex.cinema.model.SeatReservationState;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface SeatReservationRepository extends MongoRepository<SeatReservation, String> {
    List<SeatReservation> findByShowtimeId(String showtimeId);
    List<SeatReservation> findBySeatId(String seatId);
    List<SeatReservation> findByBookingId(String bookingId);
    List<SeatReservation> findByBookingIdAndState(String bookingId, SeatReservationState state);
    List<SeatReservation> findByShowtimeIdAndSeatIdIn(String showtimeId, Collection<String> seatIds);
    long deleteByStateAndExpiresAtBefore(SeatReservationState state, LocalDateTime expiresAt);
    long deleteByBookingIdAndState(String bookingId, SeatReservationState state);
    boolean existsByBookingIdAndState(String bookingId, SeatReservationState state);
    boolean existsBySeatId(String seatId);
}
