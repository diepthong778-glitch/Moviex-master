package com.moviex.cinema.dto;

import com.moviex.cinema.model.ShowtimeStatus;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;

public class ShowtimeViewResponse {
    private String id;
    private String movieId;
    private String movieTitle;
    private String movieOriginalTitle;
    private String movieGenre;
    private Integer durationMinutes;
    private Integer movieReleaseYear;
    private String movieAgeRating;
    private String movieDirector;
    private java.util.List<String> movieCast;
    private String movieLanguage;
    private String movieSynopsis;
    private String posterUrl;
    private String backdropUrl;
    private String cinemaId;
    private String cinemaName;
    private String cinemaCity;
    private String auditoriumId;
    private String auditoriumName;
    private LocalDate showDate;
    private DayOfWeek dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private BigDecimal basePrice;
    private ShowtimeStatus status;

    public ShowtimeViewResponse() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getMovieId() { return movieId; }
    public void setMovieId(String movieId) { this.movieId = movieId; }
    public String getMovieTitle() { return movieTitle; }
    public void setMovieTitle(String movieTitle) { this.movieTitle = movieTitle; }
    public String getMovieOriginalTitle() { return movieOriginalTitle; }
    public void setMovieOriginalTitle(String movieOriginalTitle) { this.movieOriginalTitle = movieOriginalTitle; }
    public String getMovieGenre() { return movieGenre; }
    public void setMovieGenre(String movieGenre) { this.movieGenre = movieGenre; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public Integer getMovieReleaseYear() { return movieReleaseYear; }
    public void setMovieReleaseYear(Integer movieReleaseYear) { this.movieReleaseYear = movieReleaseYear; }
    public String getMovieAgeRating() { return movieAgeRating; }
    public void setMovieAgeRating(String movieAgeRating) { this.movieAgeRating = movieAgeRating; }
    public String getMovieDirector() { return movieDirector; }
    public void setMovieDirector(String movieDirector) { this.movieDirector = movieDirector; }
    public java.util.List<String> getMovieCast() { return movieCast; }
    public void setMovieCast(java.util.List<String> movieCast) { this.movieCast = movieCast; }
    public String getMovieLanguage() { return movieLanguage; }
    public void setMovieLanguage(String movieLanguage) { this.movieLanguage = movieLanguage; }
    public String getMovieSynopsis() { return movieSynopsis; }
    public void setMovieSynopsis(String movieSynopsis) { this.movieSynopsis = movieSynopsis; }
    public String getPosterUrl() { return posterUrl; }
    public void setPosterUrl(String posterUrl) { this.posterUrl = posterUrl; }
    public String getBackdropUrl() { return backdropUrl; }
    public void setBackdropUrl(String backdropUrl) { this.backdropUrl = backdropUrl; }
    public String getCinemaId() { return cinemaId; }
    public void setCinemaId(String cinemaId) { this.cinemaId = cinemaId; }
    public String getCinemaName() { return cinemaName; }
    public void setCinemaName(String cinemaName) { this.cinemaName = cinemaName; }
    public String getCinemaCity() { return cinemaCity; }
    public void setCinemaCity(String cinemaCity) { this.cinemaCity = cinemaCity; }
    public String getAuditoriumId() { return auditoriumId; }
    public void setAuditoriumId(String auditoriumId) { this.auditoriumId = auditoriumId; }
    public String getAuditoriumName() { return auditoriumName; }
    public void setAuditoriumName(String auditoriumName) { this.auditoriumName = auditoriumName; }
    public LocalDate getShowDate() { return showDate; }
    public void setShowDate(LocalDate showDate) { this.showDate = showDate; }
    public DayOfWeek getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(DayOfWeek dayOfWeek) { this.dayOfWeek = dayOfWeek; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }
    public BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }
    public ShowtimeStatus getStatus() { return status; }
    public void setStatus(ShowtimeStatus status) { this.status = status; }
}
