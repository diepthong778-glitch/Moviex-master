package com.moviex.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Document(collection = "subscriptions")
public class Subscription {
    @Id
    private String id;
    private String userId;
    private SubscriptionPlan planType;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long remainingDays = 0L;
    private SubscriptionStatus status = SubscriptionStatus.PENDING;
    private LocalDateTime createdAt = LocalDateTime.now();

    public Subscription() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public SubscriptionPlan getPlanType() { return planType; }
    public void setPlanType(SubscriptionPlan planType) { this.planType = planType; }
    public SubscriptionPlan getType() { return planType; }
    public void setType(SubscriptionPlan type) { this.planType = type; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public Long getRemainingDays() { return remainingDays; }
    public void setRemainingDays(Long remainingDays) { this.remainingDays = remainingDays; }
    public SubscriptionStatus getStatus() { return status; }
    public void setStatus(SubscriptionStatus status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
