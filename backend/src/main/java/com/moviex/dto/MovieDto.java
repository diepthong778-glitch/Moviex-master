package com.moviex.dto;

import com.moviex.model.SubscriptionPlan;

public class MovieDto {
    private String id;
    private String title;
    private String genre;
    private int year;
    private String description;
    private String videoUrl;
    private String trailerUrl;
    private SubscriptionPlan requiredSubscription;

    public MovieDto() {}

    public MovieDto(String id, String title, String genre, int year, String description, String videoUrl, String trailerUrl, SubscriptionPlan requiredSubscription) {
        this.id = id;
        this.title = title;
        this.genre = genre;
        this.year = year;
        this.description = description;
        this.videoUrl = videoUrl;
        this.trailerUrl = trailerUrl;
        this.requiredSubscription = requiredSubscription;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }
    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
    public String getTrailerUrl() { return trailerUrl; }
    public void setTrailerUrl(String trailerUrl) { this.trailerUrl = trailerUrl; }
    public SubscriptionPlan getRequiredSubscription() { return requiredSubscription; }
    public void setRequiredSubscription(SubscriptionPlan requiredSubscription) { this.requiredSubscription = requiredSubscription; }
}
