package com.moviex.cinema.repository;

import com.moviex.cinema.model.Auditorium;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AuditoriumRepository extends MongoRepository<Auditorium, String> {
    List<Auditorium> findByCinemaId(String cinemaId);
    List<Auditorium> findByCinemaIdAndActiveTrue(String cinemaId);
}
