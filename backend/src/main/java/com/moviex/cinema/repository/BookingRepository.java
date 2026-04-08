package com.moviex.cinema.repository;

import com.moviex.cinema.model.Booking;
import com.moviex.cinema.model.BookingStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends MongoRepository<Booking, String> {
    List<Booking> findByUserId(String userId);
    List<Booking> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Booking> findAllByOrderByCreatedAtDesc();
    List<Booking> findByShowtimeId(String showtimeId);
    List<Booking> findBySeatsSeatId(String seatId);
    List<Booking> findByShowtimeIdAndBookingStatusIn(String showtimeId, List<BookingStatus> statuses);
    List<Booking> findByBookingStatusAndHoldExpiresAtBefore(BookingStatus status, LocalDateTime holdExpiresAt);
    Optional<Booking> findByIdAndUserId(String id, String userId);
}
