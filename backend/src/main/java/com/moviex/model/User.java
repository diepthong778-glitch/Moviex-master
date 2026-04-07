package com.moviex.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Document(collection = "users")
public class User {
    @Id
    private String id;
    @Indexed
    private String username;
    @Indexed
    private String email;
    private String phoneNumber;
    private Gender gender;
    private String password;
    private Set<Role> roles = new HashSet<>();
    @Field("isVerified")
    private boolean verified = false;
    private String verificationToken;
    private SubscriptionPlan subscriptionPlan = SubscriptionPlan.BASIC;
    private Set<String> watchlist = new HashSet<>();
    private Set<String> unlockedMovieIds = new HashSet<>();
    private String language = "en";
    private boolean darkMode = false;
    private boolean subtitle = true;
    private Set<AppModule> enabledModules = new HashSet<>(Set.of(
            AppModule.MOVIEX_STREAMING,
            AppModule.JDWOMOVIEX_CINEMA
    ));
    private AppModule preferredModule = AppModule.MOVIEX_STREAMING;
    private boolean online = false;
    private String currentlyWatching;
    private LocalDateTime lastLoginAt;
    private LocalDateTime lastSeenAt;

    public User() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public Gender getGender() { return gender; }
    public void setGender(Gender gender) { this.gender = gender; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public Set<Role> getRoles() { return roles; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }
    public boolean isVerified() { return verified; }
    public boolean getVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public String getVerificationToken() { return verificationToken; }
    public void setVerificationToken(String verificationToken) { this.verificationToken = verificationToken; }
    public SubscriptionPlan getSubscriptionPlan() { return subscriptionPlan; }
    public void setSubscriptionPlan(SubscriptionPlan subscriptionPlan) { this.subscriptionPlan = subscriptionPlan; }
    public Set<String> getWatchlist() { return watchlist; }
    public void setWatchlist(Set<String> watchlist) { this.watchlist = watchlist; }
    public Set<String> getUnlockedMovieIds() { return unlockedMovieIds; }
    public void setUnlockedMovieIds(Set<String> unlockedMovieIds) { this.unlockedMovieIds = unlockedMovieIds; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public boolean isDarkMode() { return darkMode; }
    public void setDarkMode(boolean darkMode) { this.darkMode = darkMode; }
    public boolean isSubtitle() { return subtitle; }
    public void setSubtitle(boolean subtitle) { this.subtitle = subtitle; }
    public Set<AppModule> getEnabledModules() { return enabledModules; }
    public void setEnabledModules(Set<AppModule> enabledModules) { this.enabledModules = enabledModules; }
    public AppModule getPreferredModule() { return preferredModule; }
    public void setPreferredModule(AppModule preferredModule) { this.preferredModule = preferredModule; }
    public boolean isOnline() { return online; }
    public void setOnline(boolean online) { this.online = online; }
    public String getCurrentlyWatching() { return currentlyWatching; }
    public void setCurrentlyWatching(String currentlyWatching) { this.currentlyWatching = currentlyWatching; }
    public LocalDateTime getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(LocalDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; }
    public LocalDateTime getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(LocalDateTime lastSeenAt) { this.lastSeenAt = lastSeenAt; }
}
