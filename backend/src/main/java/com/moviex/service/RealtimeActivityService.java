package com.moviex.service;

import com.moviex.model.SubscriptionPlan;
import com.moviex.model.User;
import com.moviex.websocket.ActivityWebSocketHandler;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class RealtimeActivityService {

    private final ActivityWebSocketHandler activityWebSocketHandler;

    public RealtimeActivityService(ActivityWebSocketHandler activityWebSocketHandler) {
        this.activityWebSocketHandler = activityWebSocketHandler;
    }

    public void userLogin(User user) {
        broadcast("USER_LOGIN", user, Map.of());
    }

    public void userLogout(User user) {
        broadcast("USER_LOGOUT", user, Map.of());
    }

    public void userWatching(User user, String movieTitle) {
        broadcast("USER_WATCHING", user, Map.of("movieTitle", movieTitle));
    }

    public void subscriptionActivated(User user, SubscriptionPlan planType) {
        broadcast("SUBSCRIPTION_ACTIVATED", user, Map.of("planType", planType));
    }

    private void broadcast(String type, User user, Map<String, Object> extra) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", type);
        payload.put("timestamp", LocalDateTime.now());
        payload.put("userId", user.getId());
        payload.put("email", user.getEmail());
        payload.put("currentlyWatching", user.getCurrentlyWatching());
        payload.put("online", user.isOnline());
        payload.putAll(extra);
        activityWebSocketHandler.broadcast(payload);
    }
}
