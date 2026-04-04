package com.moviex.dto;

import com.moviex.model.SubscriptionPlan;

public class GrantAccessRequest {
    private String userId;
    private SubscriptionPlan planType;
    private Integer durationDays;

    public GrantAccessRequest() {}

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public SubscriptionPlan getPlanType() { return planType; }
    public void setPlanType(SubscriptionPlan planType) { this.planType = planType; }
    public Integer getDurationDays() { return durationDays; }
    public void setDurationDays(Integer durationDays) { this.durationDays = durationDays; }
}
