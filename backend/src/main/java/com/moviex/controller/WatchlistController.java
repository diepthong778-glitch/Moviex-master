package com.moviex.controller;

import com.moviex.dto.MovieDto;
import com.moviex.dto.WatchlistAddRequest;
import com.moviex.service.WatchlistService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/watchlist")
public class WatchlistController {

    private final WatchlistService watchlistService;

    public WatchlistController(WatchlistService watchlistService) {
        this.watchlistService = watchlistService;
    }

    @PostMapping("/add")
    public ResponseEntity<List<MovieDto>> addToWatchlist(@RequestBody WatchlistAddRequest request) {
        watchlistService.addToWatchlist(request);
        return ResponseEntity.ok(watchlistService.getWatchlist());
    }

    @GetMapping
    public ResponseEntity<List<MovieDto>> getWatchlist() {
        return ResponseEntity.ok(watchlistService.getWatchlist());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<List<MovieDto>> removeFromWatchlist(@PathVariable String id) {
        watchlistService.removeFromWatchlist(id);
        return ResponseEntity.ok(watchlistService.getWatchlist());
    }
}
