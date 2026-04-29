package com.moviex.dto;

import com.moviex.model.SubscriptionPlan;

import java.util.List;

public class MovieDto {
    private String id;
    private String title;
    private String originalTitle;
    private String genre;
    private int year;
    private String description;
    private String videoUrl;
    private String trailerUrl;
    private String posterUrl;
    private String backdropUrl;
    private Integer runtimeMinutes;
    private String ageRating;
    private String director;
    private List<String> cast;
    private String language;
    private SubscriptionPlan requiredSubscription;

    public MovieDto() {}

    public MovieDto(String id, String title, String genre, int year, String description, String videoUrl, String trailerUrl, SubscriptionPlan requiredSubscription) {
        this(id, title, null, genre, year, description, videoUrl, trailerUrl, null, null, null, null, null, null, null, requiredSubscription);
    }

    public MovieDto(String id, String title, String originalTitle, String genre, int year, String description,
                    String videoUrl, String trailerUrl, String posterUrl, String backdropUrl,
                    Integer runtimeMinutes, String ageRating, String director, List<String> cast,
                    String language, SubscriptionPlan requiredSubscription) {
        this.id = id;
        this.title = title;
        this.originalTitle = originalTitle;
        this.genre = genre;
        this.year = year;
        this.description = description;
        this.videoUrl = videoUrl;
        this.trailerUrl = trailerUrl;
        this.posterUrl = posterUrl;
        this.backdropUrl = backdropUrl;
        this.runtimeMinutes = runtimeMinutes;
        this.ageRating = ageRating;
        this.director = director;
        this.cast = cast;
        this.language = language;
        this.requiredSubscription = requiredSubscription;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getOriginalTitle() { return originalTitle; }
    public void setOriginalTitle(String originalTitle) { this.originalTitle = originalTitle; }
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
    public String getPosterUrl() { return posterUrl; }
    public void setPosterUrl(String posterUrl) { this.posterUrl = posterUrl; }
    public String getBackdropUrl() { return backdropUrl; }
    public void setBackdropUrl(String backdropUrl) { this.backdropUrl = backdropUrl; }
    public Integer getRuntimeMinutes() { return runtimeMinutes; }
    public void setRuntimeMinutes(Integer runtimeMinutes) { this.runtimeMinutes = runtimeMinutes; }
    public String getAgeRating() { return ageRating; }
    public void setAgeRating(String ageRating) { this.ageRating = ageRating; }
    public String getDirector() { return director; }
    public void setDirector(String director) { this.director = director; }
    public List<String> getCast() { return cast; }
    public void setCast(List<String> cast) { this.cast = cast; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public SubscriptionPlan getRequiredSubscription() { return requiredSubscription; }
    public void setRequiredSubscription(SubscriptionPlan requiredSubscription) { this.requiredSubscription = requiredSubscription; }
}
