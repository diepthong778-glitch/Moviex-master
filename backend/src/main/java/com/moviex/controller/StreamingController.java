package com.moviex.controller;

import com.moviex.model.Movie;
import com.moviex.model.User;
import com.moviex.repository.MovieRepository;
import com.moviex.service.CurrentUserService;
import com.moviex.model.SubscriptionPlan;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.core.io.UrlResource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Optional;

@RestController
@RequestMapping("/api/stream")
public class StreamingController {

    private final MovieRepository movieRepository;
    private final CurrentUserService currentUserService;
    private final ResourceLoader resourceLoader;

    public StreamingController(MovieRepository movieRepository, 
                               CurrentUserService currentUserService,
                               ResourceLoader resourceLoader) {
        this.movieRepository = movieRepository;
        this.currentUserService = currentUserService;
        this.resourceLoader = resourceLoader;
    }

    @GetMapping("/{movieId}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<ResourceRegion> streamVideo(
            @PathVariable String movieId,
            @RequestHeader HttpHeaders headers) throws IOException {

        Optional<Movie> movieOpt = movieRepository.findById(movieId);
        if (movieOpt.isEmpty() || movieOpt.get().getVideoUrl() == null) {
            return ResponseEntity.notFound().build();
        }

        Movie movie = movieOpt.get();
        User currentUser = currentUserService.getCurrentUser();

        if (!canAccessMovie(currentUser, movie)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your current plan does not support streaming this movie.");
        }

        String videoPath = movie.getVideoUrl();
        Resource video;
        if (videoPath.startsWith("http") || videoPath.startsWith("https")) {
            video = new UrlResource(videoPath);
        } else {
            video = resourceLoader.getResource(videoPath.startsWith("/") ? "classpath:static" + videoPath : videoPath);
        }

        if (!video.exists()) {
            return ResponseEntity.notFound().build();
        }

        ResourceRegion region = resourceRegion(video, headers);

        return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                .contentType(MediaTypeFactory.getMediaType(video).orElse(MediaType.valueOf("video/mp4")))
                .body(region);
    }

    private boolean canAccessMovie(User user, Movie movie) {
        boolean isAdmin = user.getRoles().contains(com.moviex.model.Role.ROLE_ADMIN);
        if (isAdmin) return true;

        SubscriptionPlan userPlan = user.getSubscriptionPlan() != null ? user.getSubscriptionPlan() : SubscriptionPlan.BASIC;
        SubscriptionPlan requiredPlan = movie.getRequiredSubscription() != null ? movie.getRequiredSubscription() : SubscriptionPlan.BASIC;

        if (requiredPlan == SubscriptionPlan.BASIC) return true;
        if (userPlan == SubscriptionPlan.PREMIUM) return true;
        return userPlan == SubscriptionPlan.STANDARD && requiredPlan == SubscriptionPlan.STANDARD;
    }

    private ResourceRegion resourceRegion(Resource video, HttpHeaders headers) throws IOException {
        long contentLength = video.contentLength();
        HttpRange range = headers.getRange().isEmpty() ? null : headers.getRange().get(0);
        if (range != null) {
            long start = range.getRangeStart(contentLength);
            long end = range.getRangeEnd(contentLength);
            long rangeLength = Math.min(1024 * 1024, end - start + 1); // 1MB chunks
            return new ResourceRegion(video, start, rangeLength);
        } else {
            long rangeLength = Math.min(1024 * 1024, contentLength);
            return new ResourceRegion(video, 0, rangeLength);
        }
    }
}
