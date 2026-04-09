package com.moviex.cinema.controller;

import com.moviex.cinema.dto.CreateShowtimeRequest;
import com.moviex.cinema.dto.SeatAvailabilityResponse;
import com.moviex.cinema.dto.ShowtimeViewResponse;
import com.moviex.cinema.model.MovieShowtime;
import com.moviex.cinema.service.SeatService;
import com.moviex.cinema.service.ShowtimeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/cinema/showtimes")
public class ShowtimeController {
    private final ShowtimeService showtimeService;
    private final SeatService seatService;

    public ShowtimeController(ShowtimeService showtimeService, SeatService seatService) {
        this.showtimeService = showtimeService;
        this.seatService = seatService;
    }

    @GetMapping
    public ResponseEntity<List<MovieShowtime>> listShowtimes(
            @RequestParam(required = false) String cinemaId,
            @RequestParam(required = false) String movieId,
            @RequestParam(required = false) String auditoriumId,
            @RequestParam(required = false) LocalDate showDate,
            @RequestParam(required = false) String dayOfWeek) {
        DayOfWeek parsedDayOfWeek = showtimeService.parseDayOfWeek(dayOfWeek);
        return ResponseEntity.ok(showtimeService.listShowtimes(
                cinemaId,
                movieId,
                auditoriumId,
                showDate,
                parsedDayOfWeek
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovieShowtime> getShowtime(@PathVariable String id) {
        return ResponseEntity.ok(showtimeService.getShowtime(id));
    }

    @GetMapping("/view")
    public ResponseEntity<List<ShowtimeViewResponse>> listShowtimeViews(
            @RequestParam(required = false) String cinemaId,
            @RequestParam(required = false) String movieId,
            @RequestParam(required = false) String auditoriumId,
            @RequestParam(required = false) LocalDate showDate,
            @RequestParam(required = false) String dayOfWeek) {
        DayOfWeek parsedDayOfWeek = showtimeService.parseDayOfWeek(dayOfWeek);
        return ResponseEntity.ok(showtimeService.listShowtimeViews(
                cinemaId,
                movieId,
                auditoriumId,
                showDate,
                parsedDayOfWeek
        ));
    }

    @GetMapping("/{id}/view")
    public ResponseEntity<ShowtimeViewResponse> getShowtimeView(@PathVariable String id) {
        return ResponseEntity.ok(showtimeService.getShowtimeView(id));
    }

    @GetMapping("/{id}/seats")
    public ResponseEntity<List<SeatAvailabilityResponse>> listSeatAvailability(@PathVariable String id) {
        return ResponseEntity.ok(seatService.listSeatAvailability(id));
    }

    @PostMapping
    public ResponseEntity<MovieShowtime> createShowtime(@RequestBody CreateShowtimeRequest request) {
        return ResponseEntity.ok(showtimeService.createShowtime(request));
    }
}
