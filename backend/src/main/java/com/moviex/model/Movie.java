package com.moviex.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "movies")
public class Movie {

    @Id
    private String id;
    @Indexed
    private String title;
    @Indexed
    private String genre;
    @Indexed
    private int year;
    private String description;
    private String videoUrl;
    private String trailerUrl;
    private String posterUrl;
    private String backdropUrl;
    private String originalTitle;
    private Integer runtimeMinutes;
    private Integer durationMinutes;
    private String ageRating;
    private String director;
    private java.util.List<String> cast;
    private String language;
    private String streamType = "MP4";
    private boolean hasFullMovie = false;
    private java.util.List<String> subtitleUrls;
    private java.util.List<String> subtitles;
    private java.util.List<String> availableQualities;
    private Integer introStart;
    private Integer introEnd;
    private String qualityMetadata;
    private SubscriptionPlan requiredSubscription = SubscriptionPlan.BASIC;

    public Movie() {}

    public Movie(String id, String title, String genre, int year, String description, String videoUrl, String trailerUrl, SubscriptionPlan requiredSubscription) {
        this.id = id;
        this.title = title;
        this.genre = genre;
        this.year = year;
        this.description = description;
        this.videoUrl = videoUrl;
        this.trailerUrl = trailerUrl;
        this.requiredSubscription = requiredSubscription;
    }

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
    public String getPosterUrl() { return posterUrl; }
    public void setPosterUrl(String posterUrl) { this.posterUrl = posterUrl; }
    public String getBackdropUrl() { return backdropUrl; }
    public void setBackdropUrl(String backdropUrl) { this.backdropUrl = backdropUrl; }
    public String getOriginalTitle() { return originalTitle; }
    public void setOriginalTitle(String originalTitle) { this.originalTitle = originalTitle; }
    public Integer getRuntimeMinutes() { return runtimeMinutes; }
    public void setRuntimeMinutes(Integer runtimeMinutes) { this.runtimeMinutes = runtimeMinutes; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public String getAgeRating() { return ageRating; }
    public void setAgeRating(String ageRating) { this.ageRating = ageRating; }
    public String getDirector() { return director; }
    public void setDirector(String director) { this.director = director; }
    public java.util.List<String> getCast() { return cast; }
    public void setCast(java.util.List<String> cast) { this.cast = cast; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public String getStreamType() { return streamType; }
    public void setStreamType(String streamType) { this.streamType = streamType; }
    public boolean isHasFullMovie() { return hasFullMovie; }
    public void setHasFullMovie(boolean hasFullMovie) { this.hasFullMovie = hasFullMovie; }
    public java.util.List<String> getSubtitleUrls() { return subtitleUrls; }
    public void setSubtitleUrls(java.util.List<String> subtitleUrls) { this.subtitleUrls = subtitleUrls; }
    public java.util.List<String> getSubtitles() { return subtitles; }
    public void setSubtitles(java.util.List<String> subtitles) { this.subtitles = subtitles; }
    public java.util.List<String> getAvailableQualities() { return availableQualities; }
    public void setAvailableQualities(java.util.List<String> availableQualities) { this.availableQualities = availableQualities; }
    public Integer getIntroStart() { return introStart; }
    public void setIntroStart(Integer introStart) { this.introStart = introStart; }
    public Integer getIntroEnd() { return introEnd; }
    public void setIntroEnd(Integer introEnd) { this.introEnd = introEnd; }
    public String getQualityMetadata() { return qualityMetadata; }
    public void setQualityMetadata(String qualityMetadata) { this.qualityMetadata = qualityMetadata; }
    public SubscriptionPlan getRequiredSubscription() { return requiredSubscription; }
    public void setRequiredSubscription(SubscriptionPlan requiredSubscription) { this.requiredSubscription = requiredSubscription; }
}
