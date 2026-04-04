package com.moviex.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "payments")
public class Payment {
    @Id
    private String id;
    private String userId;
    private SubscriptionPlan planType;
    private BigDecimal amount;
    private PaymentStatus status = PaymentStatus.PENDING;
    private PaymentMethod paymentMethod = PaymentMethod.QR;
    private LocalDateTime createdAt = LocalDateTime.now();

    public Payment() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public SubscriptionPlan getPlanType() { return planType; }
    public void setPlanType(SubscriptionPlan planType) { this.planType = planType; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
