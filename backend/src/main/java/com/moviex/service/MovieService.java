package com.moviex.service;

import com.moviex.dto.MovieDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface MovieService {
    Page<MovieDto> searchMovies(String title, String genre, Integer year, Pageable pageable);
    List<MovieDto> getAllMovies();
    Optional<MovieDto> getMovieById(String id);
}