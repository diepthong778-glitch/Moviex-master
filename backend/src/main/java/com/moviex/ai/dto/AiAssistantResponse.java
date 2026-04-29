package com.moviex.ai.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class AiAssistantResponse {
    private String intent;
    private String locale;
    private String answer;
    private String source;
    private boolean requiresAuth;
    private String handoffPath;
    private String handoffLabel;
    private List<String> suggestions = new ArrayList<>();
    private List<AiAssistantCard> cards = new ArrayList<>();
    private LocalDateTime timestamp = LocalDateTime.now();

    public String getIntent() {
        return intent;
    }

    public void setIntent(String intent) {
        this.intent = intent;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public boolean isRequiresAuth() {
        return requiresAuth;
    }

    public void setRequiresAuth(boolean requiresAuth) {
        this.requiresAuth = requiresAuth;
    }

    public String getHandoffPath() {
        return handoffPath;
    }

    public void setHandoffPath(String handoffPath) {
        this.handoffPath = handoffPath;
    }

    public String getHandoffLabel() {
        return handoffLabel;
    }

    public void setHandoffLabel(String handoffLabel) {
        this.handoffLabel = handoffLabel;
    }

    public List<String> getSuggestions() {
        return suggestions;
    }

    public void setSuggestions(List<String> suggestions) {
        this.suggestions = suggestions == null ? new ArrayList<>() : suggestions;
    }

    public List<AiAssistantCard> getCards() {
        return cards;
    }

    public void setCards(List<AiAssistantCard> cards) {
        this.cards = cards == null ? new ArrayList<>() : cards;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
