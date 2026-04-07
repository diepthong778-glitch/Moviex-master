package com.moviex.cinema.service;

import com.moviex.cinema.dto.CreateShowtimeRequest;
import com.moviex.cinema.model.MovieShowtime;
import com.moviex.cinema.model.ShowtimeStatus;
import com.moviex.cinema.repository.AuditoriumRepository;
import com.moviex.cinema.repository.CinemaRepository;
import com.moviex.cinema.repository.MovieShowtimeRepository;
import com.moviex.model.Movie;
import com.moviex.repository.MovieRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ShowtimeService {
    private final MovieShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final CinemaRepository cinemaRepository;
    private final AuditoriumRepository auditoriumRepository;

    public ShowtimeService(MovieShowtimeRepository showtimeRepository,
                           MovieRepository movieRepository,
                           CinemaRepository cinemaRepository,
                           AuditoriumRepository auditoriumRepository) {
        this.showtimeRepository = showtimeRepository;
        this.movieRepository = movieRepository;
        this.cinemaRepository = cinemaRepository;
        this.auditoriumRepository = auditoriumRepository;
    }

    public MovieShowtime createShowtime(CreateShowtimeRequest request) {
        if (request.getMovieId() == null || request.getMovieId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "movieId is required");
        }
        if (request.getCinemaId() == null || request.getCinemaId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "cinemaId is required");
        }
        if (request.getAuditoriumId() == null || request.getAuditoriumId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "auditoriumId is required");
        }

        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Movie not found"));
        cinemaRepository.findById(request.getCinemaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cinema not found"));
        auditoriumRepository.findById(request.getAuditoriumId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Auditorium not found"));

        MovieShowtime showtime = new MovieShowtime();
        showtime.setMovieId(movie.getId());
        showtime.setCinemaId(request.getCinemaId());
        showtime.setAuditoriumId(request.getAuditoriumId());
        showtime.setShowDate(request.getShowDate());
        showtime.setStartTime(request.getStartTime());
        showtime.setEndTime(request.getEndTime());
        showtime.setBasePrice(request.getBasePrice() == null ? BigDecimal.ZERO : request.getBasePrice());
        showtime.setStatus(ShowtimeStatus.SCHEDULED);
        showtime.setCreatedAt(LocalDateTime.now());
        showtime.setUpdatedAt(LocalDateTime.now());
        return showtimeRepository.save(showtime);
    }

    public List<MovieShowtime> listShowtimes(String cinemaId, LocalDate showDate) {
        if (cinemaId != null && showDate != null) {
            return showtimeRepository.findByCinemaIdAndShowDate(cinemaId, showDate);
        }
        if (cinemaId != null) {
            return showtimeRepository.findByCinemaIdAndShowDate(cinemaId, LocalDate.now());
        }
        return showtimeRepository.findAll();
    }

    public MovieShowtime getShowtime(String id) {
        return showtimeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Showtime not found"));
    }
}
