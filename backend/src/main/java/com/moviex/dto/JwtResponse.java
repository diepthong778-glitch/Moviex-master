package com.moviex.dto;

import java.util.List;

public class JwtResponse {
    private String token;
    private String type = "Bearer";
    private String id;
    private String username;
    private String email;
    private String phoneNumber;
    private String gender;
    private boolean verified;
    private List<String> roles;
    private String subscriptionPlan;

    public JwtResponse(String accessToken, String id, String username, String email, String phoneNumber,
                       String gender, boolean verified, List<String> roles, String subscriptionPlan) {
        this.token = accessToken;
        this.id = id;
        this.username = username;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.gender = gender;
        this.verified = verified;
        this.roles = roles;
        this.subscriptionPlan = subscriptionPlan;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public List<String> getRoles() {
        return roles;
    }

    public String getSubscriptionPlan() {
    	return subscriptionPlan;
    }
}
