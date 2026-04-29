package com.moviex.cinema.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class CreateBookingRequest {
    @NotBlank(message = "showtimeId is required")
    private String showtimeId;

    @NotEmpty(message = "seatIds are required")
    private List<String> seatIds;

    public CreateBookingRequest() {}

    public String getShowtimeId() { return showtimeId; }
    public void setShowtimeId(String showtimeId) { this.showtimeId = showtimeId; }
    public List<String> getSeatIds() { return seatIds; }
    public void setSeatIds(List<String> seatIds) { this.seatIds = seatIds; }
}
