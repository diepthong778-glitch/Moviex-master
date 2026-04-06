package com.moviex.dto;

import java.util.LinkedHashMap;
import java.util.Map;

public class AdminSummaryResponse {
    private long totalUsers;
    private long activeSubscriptions;
    private long onlineUsers;
    private Map<String, Long> usersByPlan = new LinkedHashMap<>();

    public long getTotalUsers() {
        return totalUsers;
    }

    public void setTotalUsers(long totalUsers) {
        this.totalUsers = totalUsers;
    }

    public long getActiveSubscriptions() {
        return activeSubscriptions;
    }

    public void setActiveSubscriptions(long activeSubscriptions) {
        this.activeSubscriptions = activeSubscriptions;
    }

    public long getOnlineUsers() {
        return onlineUsers;
    }

    public void setOnlineUsers(long onlineUsers) {
        this.onlineUsers = onlineUsers;
    }

    public Map<String, Long> getUsersByPlan() {
        return usersByPlan;
    }

    public void setUsersByPlan(Map<String, Long> usersByPlan) {
        this.usersByPlan = usersByPlan;
    }
}
