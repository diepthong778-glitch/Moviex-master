package com.moviex.repository;

import com.moviex.model.Movie;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MovieRepositoryCustom {
    Page<Movie> searchMovies(String title, String genre, Integer year, Pageable pageable);
}