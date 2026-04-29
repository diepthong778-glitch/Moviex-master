package com.moviex.service;

import com.moviex.dto.MovieDto;
import com.moviex.dto.WatchlistAddRequest;
import com.moviex.model.Movie;
import com.moviex.model.User;
import com.moviex.repository.MovieRepository;
import com.moviex.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class WatchlistServiceImpl implements WatchlistService {

    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final CurrentUserService currentUserService;
    private final MovieService movieService;

    public WatchlistServiceImpl(UserRepository userRepository,
                                MovieRepository movieRepository,
                                CurrentUserService currentUserService,
                                MovieService movieService) {
        this.userRepository = userRepository;
        this.movieRepository = movieRepository;
        this.currentUserService = currentUserService;
        this.movieService = movieService;
    }

    @Override
    public void addToWatchlist(WatchlistAddRequest request) {
        if (request.getMovieId() == null || request.getMovieId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "movieId is required");
        }

        User user = currentUserService.getCurrentUser();
        movieService.getMovieById(request.getMovieId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Movie not found"));

        user.getWatchlist().add(request.getMovieId());
        userRepository.save(user);
    }

    @Override
    public List<MovieDto> getWatchlist() {
        User user = currentUserService.getCurrentUser();
        List<String> watchlistIds = user.getWatchlist().stream().toList();
        if (watchlistIds.isEmpty()) return List.of();

        Map<String, Movie> moviesById = movieRepository.findAllById(watchlistIds).stream()
                .collect(Collectors.toMap(Movie::getId, Function.identity()));

        return watchlistIds.stream()
                .map(moviesById::get)
                .filter(movie -> movie != null)
                .map(this::toDto)
                .toList();
    }

    @Override
    public void removeFromWatchlist(String movieId) {
        User user = currentUserService.getCurrentUser();
        user.getWatchlist().remove(movieId);
        userRepository.save(user);
    }

    private MovieDto toDto(Movie movie) {
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
                movie.getAgeRating(),
                movie.getDirector(),
                movie.getCast(),
                movie.getLanguage(),
                movie.getRequiredSubscription()
        );
    }
}
