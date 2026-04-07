package com.moviex.cinema.dto;

import com.moviex.cinema.model.SeatStatus;
import com.moviex.cinema.model.SeatType;

public class CreateSeatRequest {
    private String cinemaId;
    private String auditoriumId;
    private String row;
    private Integer number;
    private SeatType type;
    private SeatStatus status;

    public CreateSeatRequest() {}

    public String getCinemaId() { return cinemaId; }
    public void setCinemaId(String cinemaId) { this.cinemaId = cinemaId; }
    public String getAuditoriumId() { return auditoriumId; }
    public void setAuditoriumId(String auditoriumId) { this.auditoriumId = auditoriumId; }
    public String getRow() { return row; }
    public void setRow(String row) { this.row = row; }
    public Integer getNumber() { return number; }
    public void setNumber(Integer number) { this.number = number; }
    public SeatType getType() { return type; }
    public void setType(SeatType type) { this.type = type; }
    public SeatStatus getStatus() { return status; }
    public void setStatus(SeatStatus status) { this.status = status; }
}
