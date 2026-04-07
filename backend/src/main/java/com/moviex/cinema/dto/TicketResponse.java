package com.moviex.cinema.dto;

import java.time.LocalDateTime;

public class TicketResponse {
    private String ticketId;
    private String ticketCode;
    private String seatId;
    private String showtimeId;
    private LocalDateTime issuedAt;

    public TicketResponse() {}

    public TicketResponse(String ticketId, String ticketCode, String seatId, String showtimeId, LocalDateTime issuedAt) {
        this.ticketId = ticketId;
        this.ticketCode = ticketCode;
        this.seatId = seatId;
        this.showtimeId = showtimeId;
        this.issuedAt = issuedAt;
    }

    public String getTicketId() { return ticketId; }
    public void setTicketId(String ticketId) { this.ticketId = ticketId; }
    public String getTicketCode() { return ticketCode; }
    public void setTicketCode(String ticketCode) { this.ticketCode = ticketCode; }
    public String getSeatId() { return seatId; }
    public void setSeatId(String seatId) { this.seatId = seatId; }
    public String getShowtimeId() { return showtimeId; }
    public void setShowtimeId(String showtimeId) { this.showtimeId = showtimeId; }
    public LocalDateTime getIssuedAt() { return issuedAt; }
    public void setIssuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; }
}
