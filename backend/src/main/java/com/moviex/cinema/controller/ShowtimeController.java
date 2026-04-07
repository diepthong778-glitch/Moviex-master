package com.moviex.cinema.controller;

import com.moviex.cinema.dto.CreateShowtimeRequest;
import com.moviex.cinema.dto.SeatAvailabilityResponse;
import com.moviex.cinema.model.MovieShowtime;
import com.moviex.cinema.service.SeatService;
import com.moviex.cinema.service.ShowtimeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
            @RequestParam(required = false) LocalDate showDate) {
        return ResponseEntity.ok(showtimeService.listShowtimes(cinemaId, showDate));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovieShowtime> getShowtime(@PathVariable String id) {
        return ResponseEntity.ok(showtimeService.getShowtime(id));
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
