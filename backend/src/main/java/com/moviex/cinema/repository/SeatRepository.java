package com.moviex.cinema.repository;

import com.moviex.cinema.model.Seat;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SeatRepository extends MongoRepository<Seat, String> {
    List<Seat> findByAuditoriumId(String auditoriumId);
    List<Seat> findByCinemaIdAndAuditoriumId(String cinemaId, String auditoriumId);
}
