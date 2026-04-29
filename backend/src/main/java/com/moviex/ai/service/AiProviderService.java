package com.moviex.ai.service;

import com.moviex.ai.model.AiIntent;

import java.util.List;
import java.util.Optional;

public interface AiProviderService {
    boolean isAvailable();

    Optional<String> composeAnswer(
            AiIntent intent,
            String locale,
            String userMessage,
            List<String> facts,
            String fallbackAnswer
    );
}
