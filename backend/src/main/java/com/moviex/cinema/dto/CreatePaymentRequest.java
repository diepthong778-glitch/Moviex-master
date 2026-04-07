package com.moviex.cinema.dto;

public class CreatePaymentRequest {
    private String bookingId;

    public CreatePaymentRequest() {}

    public String getBookingId() { return bookingId; }
    public void setBookingId(String bookingId) { this.bookingId = bookingId; }
}
