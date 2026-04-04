package com.moviex.controller;

import com.moviex.model.Movie;
import com.moviex.repository.MovieRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/admin/movies")
@PreAuthorize("hasRole('ADMIN')")
public class AdminMovieController {

    private final MovieRepository movieRepository;

    public AdminMovieController(MovieRepository movieRepository) {
        this.movieRepository = movieRepository;
    }

    @PostMapping
    public ResponseEntity<Movie> createMovie(@RequestBody Movie movie) {
        Movie savedMovie = movieRepository.save(movie);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedMovie);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Movie> updateMovie(@PathVariable String id, @RequestBody Movie movieDetails) {
        Optional<Movie> movieOptional = movieRepository.findById(id);

        if (movieOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Movie movie = movieOptional.get();
        movie.setTitle(movieDetails.getTitle());
        movie.setGenre(movieDetails.getGenre());
        movie.setYear(movieDetails.getYear());
        movie.setDescription(movieDetails.getDescription());
        movie.setVideoUrl(movieDetails.getVideoUrl());
        movie.setTrailerUrl(movieDetails.getTrailerUrl());
        movie.setRequiredSubscription(movieDetails.getRequiredSubscription());

        return ResponseEntity.ok(movieRepository.save(movie));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMovie(@PathVariable String id) {
        if (!movieRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        movieRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
