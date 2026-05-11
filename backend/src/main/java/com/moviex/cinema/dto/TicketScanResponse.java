package com.moviex.cinema.dto;

import java.time.LocalDateTime;

public class TicketScanResponse {
    public enum ScanState {
        VALID,
        INVALID,
        EXPIRED,
        ALREADY_USED,
        PAYMENT_PENDING
    }

    private ScanState state;
    private String message;
    private CinemaTicketViewResponse ticketDetail;
    private LocalDateTime scannedAt;
    private String scannedBy;

    public TicketScanResponse() {}

    public ScanState getState() { return state; }
    public void setState(ScanState state) { this.state = state; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public CinemaTicketViewResponse getTicketDetail() { return ticketDetail; }
    public void setTicketDetail(CinemaTicketViewResponse ticketDetail) { this.ticketDetail = ticketDetail; }
    public LocalDateTime getScannedAt() { return scannedAt; }
    public void setScannedAt(LocalDateTime scannedAt) { this.scannedAt = scannedAt; }
    public String getScannedBy() { return scannedBy; }
    public void setScannedBy(String scannedBy) { this.scannedBy = scannedBy; }
}
