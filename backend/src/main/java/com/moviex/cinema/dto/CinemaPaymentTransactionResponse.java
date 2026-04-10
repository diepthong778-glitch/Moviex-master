package com.moviex.cinema.dto;

import com.moviex.cinema.model.BookingStatus;
import com.moviex.cinema.model.CinemaPaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class CinemaPaymentTransactionResponse {
    private String bookingId;
    private String bookingCode;
    private String txnCode;
    private BigDecimal amount = BigDecimal.ZERO;
    private CinemaPaymentStatus status;
    private BookingStatus bookingStatus;
    private CinemaPaymentStatus paymentStatus;
    private String provider;
    private String paymentPageUrl;
    private String movieTitle;
    private String cinemaName;
    private String auditoriumName;
    private LocalDate showDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private List<String> seats = new ArrayList<>();
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public CinemaPaymentTransactionResponse() {}

    public String getBookingId() { return bookingId; }
    public void setBookingId(String bookingId) { this.bookingId = bookingId; }
    public String getBookingCode() { return bookingCode; }
    public void setBookingCode(String bookingCode) { this.bookingCode = bookingCode; }
    public String getTxnCode() { return txnCode; }
    public void setTxnCode(String txnCode) { this.txnCode = txnCode; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public CinemaPaymentStatus getStatus() { return status; }
    public void setStatus(CinemaPaymentStatus status) { this.status = status; }
    public BookingStatus getBookingStatus() { return bookingStatus; }
    public void setBookingStatus(BookingStatus bookingStatus) { this.bookingStatus = bookingStatus; }
    public CinemaPaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(CinemaPaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getPaymentPageUrl() { return paymentPageUrl; }
    public void setPaymentPageUrl(String paymentPageUrl) { this.paymentPageUrl = paymentPageUrl; }
    public String getMovieTitle() { return movieTitle; }
    public void setMovieTitle(String movieTitle) { this.movieTitle = movieTitle; }
    public String getCinemaName() { return cinemaName; }
    public void setCinemaName(String cinemaName) { this.cinemaName = cinemaName; }
    public String getAuditoriumName() { return auditoriumName; }
    public void setAuditoriumName(String auditoriumName) { this.auditoriumName = auditoriumName; }
    public LocalDate getShowDate() { return showDate; }
    public void setShowDate(LocalDate showDate) { this.showDate = showDate; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }
    public List<String> getSeats() { return seats; }
    public void setSeats(List<String> seats) { this.seats = seats; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
