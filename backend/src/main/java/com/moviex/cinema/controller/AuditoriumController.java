package com.moviex.cinema.controller;

import com.moviex.cinema.dto.CreateAuditoriumRequest;
import com.moviex.cinema.model.Auditorium;
import com.moviex.cinema.service.AuditoriumService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cinema/auditoriums")
public class AuditoriumController {
    private final AuditoriumService auditoriumService;

    public AuditoriumController(AuditoriumService auditoriumService) {
        this.auditoriumService = auditoriumService;
    }

    @GetMapping
    public ResponseEntity<List<Auditorium>> listAuditoriums(@RequestParam(required = false) String cinemaId) {
        return ResponseEntity.ok(auditoriumService.listAuditoriums(cinemaId));
    }

    @PostMapping
    public ResponseEntity<Auditorium> createAuditorium(@RequestBody CreateAuditoriumRequest request) {
        return ResponseEntity.ok(auditoriumService.createAuditorium(request));
    }
}
