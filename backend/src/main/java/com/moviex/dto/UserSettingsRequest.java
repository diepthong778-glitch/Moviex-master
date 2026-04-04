package com.moviex.dto;

public class UserSettingsRequest {
    private String language;
    private Boolean darkMode;
    private Boolean subtitle;

    public UserSettingsRequest() {}

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public Boolean getDarkMode() { return darkMode; }
    public void setDarkMode(Boolean darkMode) { this.darkMode = darkMode; }
    public Boolean getSubtitle() { return subtitle; }
    public void setSubtitle(Boolean subtitle) { this.subtitle = subtitle; }
}
