package com.moviex.cinema.repository;

import com.moviex.cinema.model.Booking;
import com.moviex.cinema.model.BookingStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BookingRepository extends MongoRepository<Booking, String> {
    List<Booking> findByUserId(String userId);
    List<Booking> findByShowtimeId(String showtimeId);
    List<Booking> findByShowtimeIdAndBookingStatusIn(String showtimeId, List<BookingStatus> statuses);
}
