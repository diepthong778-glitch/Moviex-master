package com.moviex.cinema.dto;

import com.moviex.cinema.model.BookingStatus;
import com.moviex.cinema.model.CinemaPaymentStatus;

public class AdminBookingStatusUpdateRequest {
    private BookingStatus bookingStatus;
    private CinemaPaymentStatus paymentStatus;

    public AdminBookingStatusUpdateRequest() {}

    public BookingStatus getBookingStatus() { return bookingStatus; }
    public void setBookingStatus(BookingStatus bookingStatus) { this.bookingStatus = bookingStatus; }
    public CinemaPaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(CinemaPaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }
}
