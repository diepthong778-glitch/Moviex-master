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
    private Integer durationMinutes;
    private String ageRating;
    private String director;
    private List<String> cast;
    private String language;
    private String streamType;
    private boolean hasFullMovie;
    private List<String> subtitleUrls;
    private List<String> subtitles;
    private List<String> availableQualities;
    private Integer introStart;
    private Integer introEnd;
    private String qualityMetadata;
    private SubscriptionPlan requiredSubscription;

    public MovieDto() {}

    public MovieDto(String id, String title, String genre, int year, String description, String videoUrl, String trailerUrl, SubscriptionPlan requiredSubscription) {
        this(id, title, null, genre, year, description, videoUrl, trailerUrl, null, null, null, null, null, null, null, null, null, false, null, null, null, null, null, null, requiredSubscription);
    }

    public MovieDto(String id, String title, String originalTitle, String genre, int year, String description,
                    String videoUrl, String trailerUrl, String posterUrl, String backdropUrl,
                    Integer runtimeMinutes, Integer durationMinutes, String ageRating, String director, List<String> cast,
                    String language, String streamType, boolean hasFullMovie, List<String> subtitleUrls, List<String> subtitles,
                    List<String> availableQualities, Integer introStart, Integer introEnd, String qualityMetadata,
                    SubscriptionPlan requiredSubscription) {
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
        this.durationMinutes = durationMinutes;
        this.ageRating = ageRating;
        this.director = director;
        this.cast = cast;
        this.language = language;
        this.streamType = streamType;
        this.hasFullMovie = hasFullMovie;
        this.subtitleUrls = subtitleUrls;
        this.subtitles = subtitles;
        this.availableQualities = availableQualities;
        this.introStart = introStart;
        this.introEnd = introEnd;
        this.qualityMetadata = qualityMetadata;
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
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public String getAgeRating() { return ageRating; }
    public void setAgeRating(String ageRating) { this.ageRating = ageRating; }
    public String getDirector() { return director; }
    public void setDirector(String director) { this.director = director; }
    public List<String> getCast() { return cast; }
    public void setCast(List<String> cast) { this.cast = cast; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public String getStreamType() { return streamType; }
    public void setStreamType(String streamType) { this.streamType = streamType; }
    public boolean isHasFullMovie() { return hasFullMovie; }
    public void setHasFullMovie(boolean hasFullMovie) { this.hasFullMovie = hasFullMovie; }
    public List<String> getSubtitleUrls() { return subtitleUrls; }
    public void setSubtitleUrls(List<String> subtitleUrls) { this.subtitleUrls = subtitleUrls; }
    public List<String> getSubtitles() { return subtitles; }
    public void setSubtitles(List<String> subtitles) { this.subtitles = subtitles; }
    public List<String> getAvailableQualities() { return availableQualities; }
    public void setAvailableQualities(List<String> availableQualities) { this.availableQualities = availableQualities; }
    public Integer getIntroStart() { return introStart; }
    public void setIntroStart(Integer introStart) { this.introStart = introStart; }
    public Integer getIntroEnd() { return introEnd; }
    public void setIntroEnd(Integer introEnd) { this.introEnd = introEnd; }
    public String getQualityMetadata() { return qualityMetadata; }
    public void setQualityMetadata(String qualityMetadata) { this.qualityMetadata = qualityMetadata; }
    public SubscriptionPlan getRequiredSubscription() { return requiredSubscription; }
    public void setRequiredSubscription(SubscriptionPlan requiredSubscription) { this.requiredSubscription = requiredSubscription; }
}
