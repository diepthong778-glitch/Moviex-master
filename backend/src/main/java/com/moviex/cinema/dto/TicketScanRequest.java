package com.moviex.cinema.dto;

public class TicketScanRequest {
    private String qrToken;

    public TicketScanRequest() {}

    public String getQrToken() { return qrToken; }
    public void setQrToken(String qrToken) { this.qrToken = qrToken; }
}
