package com.moviex.cinema.controller;

import com.moviex.cinema.dto.CreateSeatRequest;
import com.moviex.cinema.model.Seat;
import com.moviex.cinema.service.SeatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cinema/seats")
public class SeatController {
    private final SeatService seatService;

    public SeatController(SeatService seatService) {
        this.seatService = seatService;
    }

    @GetMapping
    public ResponseEntity<List<Seat>> listSeats(@RequestParam(required = false) String auditoriumId) {
        return ResponseEntity.ok(seatService.listSeats(auditoriumId));
    }

    @PostMapping
    public ResponseEntity<Seat> createSeat(@RequestBody CreateSeatRequest request) {
        return ResponseEntity.ok(seatService.createSeat(request));
    }
}
