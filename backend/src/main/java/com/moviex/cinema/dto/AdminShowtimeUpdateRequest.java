package com.moviex.cinema.dto;

import com.moviex.cinema.model.ShowtimeStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public class AdminShowtimeUpdateRequest {
    private String movieId;
    private String cinemaId;
    private String auditoriumId;
    private LocalDate showDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private BigDecimal basePrice;
    private ShowtimeStatus status;

    public AdminShowtimeUpdateRequest() {}

    public String getMovieId() { return movieId; }
    public void setMovieId(String movieId) { this.movieId = movieId; }
    public String getCinemaId() { return cinemaId; }
    public void setCinemaId(String cinemaId) { this.cinemaId = cinemaId; }
    public String getAuditoriumId() { return auditoriumId; }
    public void setAuditoriumId(String auditoriumId) { this.auditoriumId = auditoriumId; }
    public LocalDate getShowDate() { return showDate; }
    public void setShowDate(LocalDate showDate) { this.showDate = showDate; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }
    public BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }
    public ShowtimeStatus getStatus() { return status; }
    public void setStatus(ShowtimeStatus status) { this.status = status; }
}
