package com.moviex.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

public class AiAssistantRequest {
    @NotBlank(message = "message is required")
    @Size(max = 800, message = "message must be 800 characters or fewer")
    private String message;
    private String locale;
    private List<AiAssistantHistoryMessage> history = new ArrayList<>();
    private AiAssistantContext context = new AiAssistantContext();

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }

    public List<AiAssistantHistoryMessage> getHistory() {
        return history;
    }

    public void setHistory(List<AiAssistantHistoryMessage> history) {
        this.history = history == null ? new ArrayList<>() : history;
    }

    public AiAssistantContext getContext() {
        return context;
    }

    public void setContext(AiAssistantContext context) {
        this.context = context == null ? new AiAssistantContext() : context;
    }
}
