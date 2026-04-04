package com.moviex.dto;

import com.moviex.model.SubscriptionPlan;
import com.moviex.model.SubscriptionStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class SubscriptionResponse {
    private String id;
    private String userId;
    private SubscriptionPlan planType;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long remainingDays;
    private SubscriptionStatus status;
    private boolean active;
    private LocalDateTime createdAt;

    public SubscriptionResponse() {}

    public SubscriptionResponse(String id,
                                String userId,
                                SubscriptionPlan planType,
                                LocalDate startDate,
                                LocalDate endDate,
                                Long remainingDays,
                                SubscriptionStatus status,
                                boolean active,
                                LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.planType = planType;
        this.startDate = startDate;
        this.endDate = endDate;
        this.remainingDays = remainingDays;
        this.status = status;
        this.active = active;
        this.createdAt = createdAt;
    }

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
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
