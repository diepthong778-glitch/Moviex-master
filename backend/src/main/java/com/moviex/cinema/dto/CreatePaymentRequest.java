package com.moviex.cinema.dto;

import jakarta.validation.constraints.NotBlank;

public class CreatePaymentRequest {
    @NotBlank(message = "bookingId is required")
    private String bookingId;

    public CreatePaymentRequest() {}

    public String getBookingId() { return bookingId; }
    public void setBookingId(String bookingId) { this.bookingId = bookingId; }
}
