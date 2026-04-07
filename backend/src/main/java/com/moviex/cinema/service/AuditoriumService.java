package com.moviex.cinema.service;

import com.moviex.cinema.dto.CreateAuditoriumRequest;
import com.moviex.cinema.model.Auditorium;
import com.moviex.cinema.model.Cinema;
import com.moviex.cinema.repository.AuditoriumRepository;
import com.moviex.cinema.repository.CinemaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuditoriumService {
    private final AuditoriumRepository auditoriumRepository;
    private final CinemaRepository cinemaRepository;

    public AuditoriumService(AuditoriumRepository auditoriumRepository, CinemaRepository cinemaRepository) {
        this.auditoriumRepository = auditoriumRepository;
        this.cinemaRepository = cinemaRepository;
    }

    public Auditorium createAuditorium(CreateAuditoriumRequest request) {
        if (request.getCinemaId() == null || request.getCinemaId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "cinemaId is required");
        }

        Cinema cinema = cinemaRepository.findById(request.getCinemaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cinema not found"));

        Auditorium auditorium = new Auditorium();
        auditorium.setCinemaId(cinema.getId());
        auditorium.setName(request.getName());
        auditorium.setCapacity(request.getCapacity() == null ? 0 : request.getCapacity());
        if (request.getActive() != null) {
            auditorium.setActive(request.getActive());
        }
        auditorium.setCreatedAt(LocalDateTime.now());
        auditorium.setUpdatedAt(LocalDateTime.now());
        return auditoriumRepository.save(auditorium);
    }

    public List<Auditorium> listAuditoriums(String cinemaId) {
        if (cinemaId == null || cinemaId.trim().isEmpty()) {
            return auditoriumRepository.findAll();
        }
        return auditoriumRepository.findByCinemaId(cinemaId);
    }
}
