package com.moviex.cinema.dto;

import com.moviex.cinema.model.SeatAvailabilityStatus;
import com.moviex.cinema.model.SeatType;

public class SeatAvailabilityResponse {
    private String seatId;
    private String row;
    private Integer number;
    private SeatType type;
    private SeatAvailabilityStatus status;

    public SeatAvailabilityResponse() {}

    public SeatAvailabilityResponse(String seatId, String row, Integer number, SeatType type, SeatAvailabilityStatus status) {
        this.seatId = seatId;
        this.row = row;
        this.number = number;
        this.type = type;
        this.status = status;
    }

    public String getSeatId() { return seatId; }
    public void setSeatId(String seatId) { this.seatId = seatId; }
    public String getRow() { return row; }
    public void setRow(String row) { this.row = row; }
    public Integer getNumber() { return number; }
    public void setNumber(Integer number) { this.number = number; }
    public SeatType getType() { return type; }
    public void setType(SeatType type) { this.type = type; }
    public SeatAvailabilityStatus getStatus() { return status; }
    public void setStatus(SeatAvailabilityStatus status) { this.status = status; }
}
