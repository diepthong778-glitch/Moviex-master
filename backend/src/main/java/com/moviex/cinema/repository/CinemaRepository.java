package com.moviex.cinema.repository;

import com.moviex.cinema.model.Cinema;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CinemaRepository extends MongoRepository<Cinema, String> {
    List<Cinema> findByCityIgnoreCase(String city);
    List<Cinema> findByActiveTrue();
}
