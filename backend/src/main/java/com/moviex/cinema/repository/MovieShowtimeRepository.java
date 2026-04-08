package com.moviex.cinema.repository;

import com.moviex.cinema.model.MovieShowtime;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface MovieShowtimeRepository extends MongoRepository<MovieShowtime, String> {
    List<MovieShowtime> findByCinemaId(String cinemaId);
    List<MovieShowtime> findByCinemaIdAndShowDate(String cinemaId, LocalDate showDate);
    List<MovieShowtime> findByMovieId(String movieId);
    List<MovieShowtime> findByAuditoriumId(String auditoriumId);
}
