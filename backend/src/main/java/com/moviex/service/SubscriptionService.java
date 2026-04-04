package com.moviex.service;

import com.moviex.dto.SubscribeRequest;
import com.moviex.dto.SubscriptionResponse;
import com.moviex.model.SubscriptionPlan;
import com.moviex.model.SubscriptionStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface SubscriptionService {
    Map<String, Object> getCurrentSubscription();
    Map<String, Object> subscribe(SubscribeRequest request);
    boolean canAccessMovie(String userId, SubscriptionPlan requiredPlan);
    SubscriptionResponse createSubscription(String userId, SubscriptionPlan plan);
    SubscriptionResponse activateSubscription();
    SubscriptionResponse activateSubscription(String userId, SubscriptionPlan plan);
    void checkExpiration();
    SubscriptionResponse getUserSubscription();
    Optional<SubscriptionResponse> getUserSubscription(String userId);
    SubscriptionResponse getCurrentUserSubscription();
    List<SubscriptionResponse> getAllSubscriptions();
    SubscriptionResponse grantAccess(String userId, SubscriptionPlan plan, Integer durationDays);
    SubscriptionStatus resolveStatus(SubscriptionResponse response);
}
