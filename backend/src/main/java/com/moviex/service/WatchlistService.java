package com.moviex.service;

import com.moviex.dto.WatchlistAddRequest;
import com.moviex.dto.MovieDto;

import java.util.List;

public interface WatchlistService {
    void addToWatchlist(WatchlistAddRequest request);
    List<MovieDto> getWatchlist();
    void removeFromWatchlist(String movieId);
}
