package com.moviex.cinema.dto;

import java.util.List;

public class CreateBookingRequest {
    private String showtimeId;
    private List<String> seatIds;

    public CreateBookingRequest() {}

    public String getShowtimeId() { return showtimeId; }
    public void setShowtimeId(String showtimeId) { this.showtimeId = showtimeId; }
    public List<String> getSeatIds() { return seatIds; }
    public void setSeatIds(List<String> seatIds) { this.seatIds = seatIds; }
}
