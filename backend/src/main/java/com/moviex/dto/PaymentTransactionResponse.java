package com.moviex.dto;

import com.moviex.model.PaymentMethod;
import com.moviex.model.PaymentProviderType;
import com.moviex.model.PaymentStatus;
import com.moviex.model.PaymentTargetType;
import com.moviex.model.PaymentTransaction;
import com.moviex.model.SubscriptionPlan;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaymentTransactionResponse {
    private String id;
    private String txnCode;
    private String receiverName;
    private String receiverAccount;
    private String bankName;
    private BigDecimal amount;
    private String currency;
    private String paymentContent;
    private String paymentNote;
    private PaymentStatus status;
    private String movieId;
    private String packageId;
    private String userId;
    private SubscriptionPlan planType;
    private PaymentMethod paymentMethod;
    private PaymentProviderType provider;
    private PaymentTargetType targetType;
    private String qrPayloadUrl;
    private String redirectPath;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PaymentTransactionResponse from(PaymentTransaction transaction) {
        PaymentTransactionResponse response = new PaymentTransactionResponse();
        response.setId(transaction.getId());
        response.setTxnCode(transaction.getTxnCode());
        response.setReceiverName(transaction.getReceiverName());
        response.setReceiverAccount(transaction.getReceiverAccount());
        response.setBankName(transaction.getBankName());
        response.setAmount(transaction.getAmount());
        response.setCurrency(transaction.getCurrency());
        response.setPaymentContent(transaction.getPaymentContent());
        response.setPaymentNote(transaction.getPaymentNote());
        response.setStatus(transaction.getStatus());
        response.setMovieId(transaction.getMovieId());
        response.setPackageId(transaction.getPackageId());
        response.setUserId(transaction.getUserId());
        response.setPlanType(transaction.getPlanType());
        response.setPaymentMethod(transaction.getPaymentMethod());
        response.setProvider(transaction.getProvider());
        response.setTargetType(transaction.getTargetType());
        response.setQrPayloadUrl(transaction.getQrPayloadUrl());
        response.setRedirectPath(transaction.getRedirectPath());
        response.setPaidAt(transaction.getPaidAt());
        response.setCreatedAt(transaction.getCreatedAt());
        response.setUpdatedAt(transaction.getUpdatedAt());
        return response;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTxnCode() { return txnCode; }
    public void setTxnCode(String txnCode) { this.txnCode = txnCode; }
    public String getReceiverName() { return receiverName; }
    public void setReceiverName(String receiverName) { this.receiverName = receiverName; }
    public String getReceiverAccount() { return receiverAccount; }
    public void setReceiverAccount(String receiverAccount) { this.receiverAccount = receiverAccount; }
    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getPaymentContent() { return paymentContent; }
    public void setPaymentContent(String paymentContent) { this.paymentContent = paymentContent; }
    public String getPaymentNote() { return paymentNote; }
    public void setPaymentNote(String paymentNote) { this.paymentNote = paymentNote; }
    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }
    public String getMovieId() { return movieId; }
    public void setMovieId(String movieId) { this.movieId = movieId; }
    public String getPackageId() { return packageId; }
    public void setPackageId(String packageId) { this.packageId = packageId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public SubscriptionPlan getPlanType() { return planType; }
    public void setPlanType(SubscriptionPlan planType) { this.planType = planType; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public PaymentProviderType getProvider() { return provider; }
    public void setProvider(PaymentProviderType provider) { this.provider = provider; }
    public PaymentTargetType getTargetType() { return targetType; }
    public void setTargetType(PaymentTargetType targetType) { this.targetType = targetType; }
    public String getQrPayloadUrl() { return qrPayloadUrl; }
    public void setQrPayloadUrl(String qrPayloadUrl) { this.qrPayloadUrl = qrPayloadUrl; }
    public String getRedirectPath() { return redirectPath; }
    public void setRedirectPath(String redirectPath) { this.redirectPath = redirectPath; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
