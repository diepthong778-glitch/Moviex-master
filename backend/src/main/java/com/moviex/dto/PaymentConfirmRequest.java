package com.moviex.dto;

public class PaymentConfirmRequest {
    private String paymentId;
    private String txnCode;

    public PaymentConfirmRequest() {}

    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }
    public String getTxnCode() { return txnCode; }
    public void setTxnCode(String txnCode) { this.txnCode = txnCode; }
}
