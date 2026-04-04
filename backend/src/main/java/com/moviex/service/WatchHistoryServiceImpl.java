package com.moviex.service;

import com.moviex.dto.MovieDto;
import com.moviex.dto.WatchHistoryResponse;
import com.moviex.dto.WatchHistorySaveRequest;
import com.moviex.model.WatchHistory;
import com.moviex.model.User;
import com.moviex.repository.UserRepository;
import com.moviex.repository.WatchHistoryRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class WatchHistoryServiceImpl implements WatchHistoryService {

    private final WatchHistoryRepository watchHistoryRepository;
    private final CurrentUserService currentUserService;
    private final MovieService movieService;
    private final SubscriptionService subscriptionService;
    private final UserRepository userRepository;
    private final RealtimeActivityService realtimeActivityService;

    public WatchHistoryServiceImpl(WatchHistoryRepository watchHistoryRepository,
                                   CurrentUserService currentUserService,
                                   MovieService movieService,
                                   SubscriptionService subscriptionService,
                                   UserRepository userRepository,
                                   RealtimeActivityService realtimeActivityService) {
        this.watchHistoryRepository = watchHistoryRepository;
        this.currentUserService = currentUserService;
        this.movieService = movieService;
        this.subscriptionService = subscriptionService;
        this.userRepository = userRepository;
        this.realtimeActivityService = realtimeActivityService;
    }

    @Override
    public WatchHistoryResponse saveProgress(WatchHistorySaveRequest request) {
        return saveWhenWatch(request);
    }

    @Override
    public List<WatchHistoryResponse> getHistory() {
        return getUserHistory();
    }

    @Override
    public WatchHistoryResponse saveWhenWatch(WatchHistorySaveRequest request) {
        if (request.getMovieId() == null || request.getMovieId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "movieId is required");
        }
        if (request.getProgress() == null || request.getProgress() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "progress must be >= 0");
        }

        MovieDto movie = movieService.getMovieById(request.getMovieId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Movie not found"));

        User user = currentUserService.getCurrentUser();
        if (!subscriptionService.canAccessMovie(user.getId(), movie.getRequiredSubscription())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Upgrade required");
        }

        WatchHistory history = watchHistoryRepository.findByUserIdAndMovieId(user.getId(), request.getMovieId())
                .orElseGet(WatchHistory::new);

        history.setUserId(user.getId());
        history.setMovieId(request.getMovieId());
        history.setMovieTitle(
                request.getMovieTitle() != null && !request.getMovieTitle().isBlank()
                        ? request.getMovieTitle()
                        : movie.getTitle()
        );
        history.setProgress(request.getProgress());
        history.setWatchedAt(LocalDateTime.now());

        WatchHistory saved = watchHistoryRepository.save(history);

        user.setCurrentlyWatching(saved.getMovieTitle());
        user.setLastSeenAt(LocalDateTime.now());
        userRepository.save(user);
        realtimeActivityService.userWatching(user, saved.getMovieTitle());

        return toResponse(saved);
    }

    @Override
    public List<WatchHistoryResponse> getUserHistory() {
        return getUserHistory(100);
    }

    @Override
    public List<WatchHistoryResponse> getUserHistory(int limit) {
        String userId = currentUserService.getCurrentUser().getId();
        int resolvedLimit = Math.max(1, Math.min(limit, 500));
        return watchHistoryRepository.findByUserIdOrderByWatchedAtDesc(userId, PageRequest.of(0, resolvedLimit)).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<WatchHistoryResponse> adminGetAllHistory() {
        return adminGetAllHistory(200);
    }

    @Override
    public List<WatchHistoryResponse> adminGetAllHistory(int limit) {
        int resolvedLimit = Math.max(1, Math.min(limit, 1000));
        return watchHistoryRepository.findAllByOrderByWatchedAtDesc(PageRequest.of(0, resolvedLimit)).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public void deleteUserHistoryItem(String movieId) {
        if (movieId == null || movieId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "movieId is required");
        }

        String userId = currentUserService.getCurrentUser().getId();
        WatchHistory history = watchHistoryRepository.findByUserIdAndMovieId(userId, movieId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "History entry not found"));
        watchHistoryRepository.delete(history);
    }

    private WatchHistoryResponse toResponse(WatchHistory history) {
        String movieTitle = history.getMovieTitle();
        if (movieTitle == null || movieTitle.isBlank()) {
            Optional<MovieDto> movie = movieService.getMovieById(history.getMovieId());
            movieTitle = movie.map(MovieDto::getTitle).orElse("Unknown");
        }
        return new WatchHistoryResponse(
                history.getMovieId(),
                movieTitle,
                history.getProgress(),
                history.getWatchedAt()
        );
    }
}
