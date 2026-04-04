package com.moviex.dto;

import com.moviex.model.SubscriptionPlan;

public class SubscribeRequest {
    private SubscriptionPlan type;

    public SubscribeRequest() {}

    public SubscriptionPlan getType() { return type; }
    public void setType(SubscriptionPlan type) { this.type = type; }
}
