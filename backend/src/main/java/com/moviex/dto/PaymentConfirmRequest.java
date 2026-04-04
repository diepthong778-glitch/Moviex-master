package com.moviex.dto;

public class PaymentConfirmRequest {
    private String paymentId;

    public PaymentConfirmRequest() {}

    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }
}
