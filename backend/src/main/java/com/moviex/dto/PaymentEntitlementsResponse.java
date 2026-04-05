package com.moviex.dto;

import java.util.ArrayList;
import java.util.List;

public class PaymentEntitlementsResponse {
    private String userId;
    private String subscriptionPlan;
    private List<String> unlockedMovieIds = new ArrayList<>();

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getSubscriptionPlan() { return subscriptionPlan; }
    public void setSubscriptionPlan(String subscriptionPlan) { this.subscriptionPlan = subscriptionPlan; }
    public List<String> getUnlockedMovieIds() { return unlockedMovieIds; }
    public void setUnlockedMovieIds(List<String> unlockedMovieIds) { this.unlockedMovieIds = unlockedMovieIds; }
}
