package com.moviex.cinema.dto;

import com.moviex.cinema.model.BookingStatus;
import com.moviex.cinema.model.CinemaPaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class CinemaTicketViewResponse {
    private String bookingId;
    private String bookingCode;
    private String movieTitle;
    private String cinemaName;
    private String auditoriumName;
    private LocalDate showDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private List<String> seats = new ArrayList<>();
    private BigDecimal totalAmount = BigDecimal.ZERO;
    private CinemaPaymentStatus paymentStatus;
    private BookingStatus bookingStatus;
    private boolean upcoming;
    private LocalDateTime issuedAt;
    private LocalDateTime createdAt;
    private String ticketCode;
    private List<String> ticketCodes = new ArrayList<>();
    private String userId;
    private String userEmail;

    public CinemaTicketViewResponse() {}

    public String getBookingId() { return bookingId; }
    public void setBookingId(String bookingId) { this.bookingId = bookingId; }
    public String getBookingCode() { return bookingCode; }
    public void setBookingCode(String bookingCode) { this.bookingCode = bookingCode; }
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
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public CinemaPaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(CinemaPaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }
    public BookingStatus getBookingStatus() { return bookingStatus; }
    public void setBookingStatus(BookingStatus bookingStatus) { this.bookingStatus = bookingStatus; }
    public boolean isUpcoming() { return upcoming; }
    public void setUpcoming(boolean upcoming) { this.upcoming = upcoming; }
    public LocalDateTime getIssuedAt() { return issuedAt; }
    public void setIssuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getTicketCode() { return ticketCode; }
    public void setTicketCode(String ticketCode) { this.ticketCode = ticketCode; }
    public List<String> getTicketCodes() { return ticketCodes; }
    public void setTicketCodes(List<String> ticketCodes) { this.ticketCodes = ticketCodes; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
}
