package com.moviex.service;

import com.moviex.dto.MovieDto;
import com.moviex.model.Movie;
import com.moviex.repository.MovieRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class MovieServiceImpl implements MovieService {

    private final MovieRepository movieRepository;

    public MovieServiceImpl(MovieRepository movieRepository) {
        this.movieRepository = movieRepository;
    }

    @Override
    @Cacheable(cacheNames = "movie-search", key = "T(String).format('%s|%s|%s|%s', #title == null ? '' : #title.trim().toLowerCase(), #genre == null ? '' : #genre.trim().toLowerCase(), #year == null ? '' : #year, #pageable)")
    public Page<MovieDto> searchMovies(String title, String genre, Integer year, Pageable pageable) {
        Page<Movie> movies = movieRepository.searchMovies(title, genre, year, pageable);
        return movies.map(this::convertToDto);
    }

    @Override
    @Cacheable(cacheNames = "movie-all")
    public List<MovieDto> getAllMovies() {
        List<Movie> movies = movieRepository.findAll();
        return movies.stream().map(this::convertToDto).collect(Collectors.toList());
    }

    @Override
    @Cacheable(cacheNames = "movie-by-id", key = "#id")
    public Optional<MovieDto> getMovieById(String id) {
        Optional<Movie> movie = movieRepository.findById(id);
        return movie.map(this::convertToDto);
    }

    private MovieDto convertToDto(Movie movie) {
        return new MovieDto(
            movie.getId(),
            movie.getTitle(),
            movie.getOriginalTitle(),
            movie.getGenre(),
            movie.getYear(),
            movie.getDescription(),
            movie.getVideoUrl(),
            movie.getTrailerUrl(),
            movie.getPosterUrl(),
            movie.getBackdropUrl(),
            movie.getRuntimeMinutes(),
            movie.getDurationMinutes(),
            movie.getAgeRating(),
            movie.getDirector(),
            movie.getCast(),
            movie.getLanguage(),
            movie.getStreamType(),
            movie.isHasFullMovie(),
            movie.getSubtitleUrls(),
            movie.getSubtitles(),
            movie.getAvailableQualities(),
            movie.getIntroStart(),
            movie.getIntroEnd(),
            movie.getQualityMetadata(),
            movie.getRequiredSubscription()
        );
    }
}
