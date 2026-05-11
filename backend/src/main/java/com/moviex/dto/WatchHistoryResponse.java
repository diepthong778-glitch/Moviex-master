package com.moviex.dto;

import java.time.LocalDateTime;

public class WatchHistoryResponse {
    private String movieId;
    private String movieTitle;
    private Integer progress;
    private Integer duration;
    private LocalDateTime watchedAt;

    public WatchHistoryResponse() {}

    public WatchHistoryResponse(String movieId, String movieTitle, Integer progress, Integer duration, LocalDateTime watchedAt) {
        this.movieId = movieId;
        this.movieTitle = movieTitle;
        this.progress = progress;
        this.duration = duration;
        this.watchedAt = watchedAt;
    }

    public String getMovieId() { return movieId; }
    public void setMovieId(String movieId) { this.movieId = movieId; }
    public String getMovieTitle() { return movieTitle; }
    public void setMovieTitle(String movieTitle) { this.movieTitle = movieTitle; }
    public Integer getProgress() { return progress; }
    public void setProgress(Integer progress) { this.progress = progress; }
    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }
    public LocalDateTime getWatchedAt() { return watchedAt; }
    public void setWatchedAt(LocalDateTime watchedAt) { this.watchedAt = watchedAt; }
    public Integer getWatchTime() { return progress; }
    public void setWatchTime(Integer watchTime) { this.progress = watchTime; }
    public LocalDateTime getUpdatedAt() { return watchedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.watchedAt = updatedAt; }
}
