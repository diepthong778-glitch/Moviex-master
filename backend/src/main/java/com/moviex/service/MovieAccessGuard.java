package com.moviex.service;

import com.moviex.model.SubscriptionPlan;
import org.springframework.stereotype.Component;

@Component
public class MovieAccessGuard {

    public boolean canAccess(SubscriptionPlan userPlan, SubscriptionPlan requiredPlan) {
        if (requiredPlan == null || requiredPlan == SubscriptionPlan.BASIC) {
            return true;
        }
        if (userPlan == null) {
            return false;
        }
        if (userPlan == SubscriptionPlan.PREMIUM) {
            return true;
        }
        return userPlan == SubscriptionPlan.STANDARD && requiredPlan == SubscriptionPlan.STANDARD;
    }
}
