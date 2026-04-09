package com.moviex.cinema.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class BookingPricingBreakdown {
    private String movieId;
    private String movieTitle;
    private String cinemaId;
    private String cinemaName;
    private String auditoriumId;
    private String auditoriumName;
    private String showtimeId;
    private LocalDate showDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private BigDecimal basePrice = BigDecimal.ZERO;
    private BigDecimal vipSurcharge = BigDecimal.ZERO;
    private BigDecimal coupleMultiplier = BigDecimal.valueOf(2);
    private BigDecimal coupleSurcharge = BigDecimal.ZERO;
    private List<BookingPriceLine> seats = new ArrayList<>();
    private BigDecimal subtotal = BigDecimal.ZERO;
    private BigDecimal total = BigDecimal.ZERO;

    public BookingPricingBreakdown() {}

    public String getMovieId() { return movieId; }
    public void setMovieId(String movieId) { this.movieId = movieId; }
    public String getMovieTitle() { return movieTitle; }
    public void setMovieTitle(String movieTitle) { this.movieTitle = movieTitle; }
    public String getCinemaId() { return cinemaId; }
    public void setCinemaId(String cinemaId) { this.cinemaId = cinemaId; }
    public String getCinemaName() { return cinemaName; }
    public void setCinemaName(String cinemaName) { this.cinemaName = cinemaName; }
    public String getAuditoriumId() { return auditoriumId; }
    public void setAuditoriumId(String auditoriumId) { this.auditoriumId = auditoriumId; }
    public String getAuditoriumName() { return auditoriumName; }
    public void setAuditoriumName(String auditoriumName) { this.auditoriumName = auditoriumName; }
    public String getShowtimeId() { return showtimeId; }
    public void setShowtimeId(String showtimeId) { this.showtimeId = showtimeId; }
    public LocalDate getShowDate() { return showDate; }
    public void setShowDate(LocalDate showDate) { this.showDate = showDate; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }
    public BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }
    public BigDecimal getVipSurcharge() { return vipSurcharge; }
    public void setVipSurcharge(BigDecimal vipSurcharge) { this.vipSurcharge = vipSurcharge; }
    public BigDecimal getCoupleMultiplier() { return coupleMultiplier; }
    public void setCoupleMultiplier(BigDecimal coupleMultiplier) { this.coupleMultiplier = coupleMultiplier; }
    public BigDecimal getCoupleSurcharge() { return coupleSurcharge; }
    public void setCoupleSurcharge(BigDecimal coupleSurcharge) { this.coupleSurcharge = coupleSurcharge; }
    public List<BookingPriceLine> getSeats() { return seats; }
    public void setSeats(List<BookingPriceLine> seats) { this.seats = seats; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
}
