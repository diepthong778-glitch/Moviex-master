package com.moviex.cinema.service;

import com.moviex.cinema.dto.CreateCinemaRequest;
import com.moviex.cinema.dto.UpdateCinemaRequest;
import com.moviex.cinema.model.Cinema;
import com.moviex.cinema.repository.CinemaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CinemaService {
    private final CinemaRepository cinemaRepository;

    public CinemaService(CinemaRepository cinemaRepository) {
        this.cinemaRepository = cinemaRepository;
    }

    public Cinema createCinema(CreateCinemaRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cinema name is required");
        }

        Cinema cinema = new Cinema();
        cinema.setName(request.getName().trim());
        cinema.setAddress(request.getAddress());
        cinema.setCity(request.getCity());
        if (request.getActive() != null) {
            cinema.setActive(request.getActive());
        }
        cinema.setCreatedAt(LocalDateTime.now());
        cinema.setUpdatedAt(LocalDateTime.now());
        return cinemaRepository.save(cinema);
    }

    public Cinema updateCinema(String id, UpdateCinemaRequest request) {
        Cinema cinema = cinemaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cinema not found"));

        if (request.getName() != null) {
            cinema.setName(request.getName().trim());
        }
        if (request.getAddress() != null) {
            cinema.setAddress(request.getAddress());
        }
        if (request.getCity() != null) {
            cinema.setCity(request.getCity());
        }
        if (request.getActive() != null) {
            cinema.setActive(request.getActive());
        }
        cinema.setUpdatedAt(LocalDateTime.now());
        return cinemaRepository.save(cinema);
    }

    public Cinema getCinema(String id) {
        return cinemaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cinema not found"));
    }

    public List<Cinema> listCinemas(String city) {
        if (city != null && !city.trim().isEmpty()) {
            return cinemaRepository.findByCityIgnoreCase(city.trim());
        }
        return cinemaRepository.findAll();
    }
}
