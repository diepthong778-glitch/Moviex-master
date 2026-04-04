package com.moviex.dto;

import com.moviex.model.SubscriptionPlan;

public class PlanSelectionRequest {
    private SubscriptionPlan planType;

    public PlanSelectionRequest() {}

    public SubscriptionPlan getPlanType() { return planType; }
    public void setPlanType(SubscriptionPlan planType) { this.planType = planType; }
}
