package com.moviex.controller;

import com.moviex.dto.MovieDto;
import com.moviex.service.MovieService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/movies")
public class MovieController {

    private final MovieService movieService;

    public MovieController(MovieService movieService) {
        this.movieService = movieService;
    }

    // GET /api/movies - Get all movies
    @GetMapping
    public ResponseEntity<List<MovieDto>> getAllMovies() {
        List<MovieDto> movies = movieService.getAllMovies();
        return ResponseEntity.ok(movies);
    }

    // GET /api/movies/{id} - Get movie by ID
    @GetMapping("/{id}")
    public ResponseEntity<MovieDto> getMovieById(@PathVariable String id) {
        Optional<MovieDto> movie = movieService.getMovieById(id);
        return movie.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }

    // GET /api/movies/search - Search movies
    @GetMapping("/search")
    public ResponseEntity<Page<MovieDto>> searchMovies(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) Integer year,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "title") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<MovieDto> result = movieService.searchMovies(title, genre, year, pageable);
        return ResponseEntity.ok(result);
    }
}