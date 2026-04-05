package com.moviex.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "payment_transactions")
public class PaymentTransaction {
    @Id
    private String id;
    @Indexed(unique = true)
    private String txnCode;
    @Indexed
    private String receiverName;
    @Indexed
    private String receiverAccount;
    @Indexed
    private String bankName;
    private BigDecimal amount;
    private String currency;
    private String paymentContent;
    private String paymentNote;
    @Indexed
    private PaymentStatus status = PaymentStatus.PENDING;
    @Indexed
    private String movieId;
    @Indexed
    private String packageId;
    @Indexed
    private String userId;
    private SubscriptionPlan planType;
    private PaymentMethod paymentMethod = PaymentMethod.QR;
    private PaymentProviderType provider = PaymentProviderType.SANDBOX_QR;
    private PaymentTargetType targetType;
    private String qrPayloadUrl;
    private String redirectPath;
    private LocalDateTime paidAt;
    @Indexed
    private LocalDateTime createdAt = LocalDateTime.now();
    @Indexed
    private LocalDateTime updatedAt = LocalDateTime.now();

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
