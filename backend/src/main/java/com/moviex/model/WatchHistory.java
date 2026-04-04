package com.moviex.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "watch_history")
public class WatchHistory {
    @Id
    private String id;
    private String userId;
    private String movieId;
    private String movieTitle;
    private Integer progress;
    private Integer duration;
    private LocalDateTime watchedAt;

    public WatchHistory() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
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
