package com.moviex.cinema.controller;

import com.moviex.cinema.dto.CreateCinemaRequest;
import com.moviex.cinema.dto.UpdateCinemaRequest;
import com.moviex.cinema.model.Cinema;
import com.moviex.cinema.service.CinemaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cinema/cinemas")
public class CinemaController {
    private final CinemaService cinemaService;

    public CinemaController(CinemaService cinemaService) {
        this.cinemaService = cinemaService;
    }

    @GetMapping
    public ResponseEntity<List<Cinema>> listCinemas(@RequestParam(required = false) String city) {
        return ResponseEntity.ok(cinemaService.listCinemas(city));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Cinema> getCinema(@PathVariable String id) {
        return ResponseEntity.ok(cinemaService.getCinema(id));
    }

    @PostMapping
    public ResponseEntity<Cinema> createCinema(@RequestBody CreateCinemaRequest request) {
        return ResponseEntity.ok(cinemaService.createCinema(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Cinema> updateCinema(@PathVariable String id, @RequestBody UpdateCinemaRequest request) {
        return ResponseEntity.ok(cinemaService.updateCinema(id, request));
    }
}
