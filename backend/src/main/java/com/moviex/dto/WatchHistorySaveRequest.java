package com.moviex.dto;

public class WatchHistorySaveRequest {
    private String movieId;
    private String movieTitle;
    private Integer progress;
    private Integer duration;

    public WatchHistorySaveRequest() {}

    public String getMovieId() { return movieId; }
    public void setMovieId(String movieId) { this.movieId = movieId; }
    public String getMovieTitle() { return movieTitle; }
    public void setMovieTitle(String movieTitle) { this.movieTitle = movieTitle; }
    public Integer getProgress() { return progress; }
    public void setProgress(Integer progress) { this.progress = progress; }
    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }
    public Integer getWatchTime() { return progress; }
    public void setWatchTime(Integer watchTime) { this.progress = watchTime; }
}
