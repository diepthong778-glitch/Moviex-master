package com.moviex.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.moviex.ai.config.AiProperties;
import com.moviex.ai.model.AiIntent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class OpenAiCompatibleAiProviderService implements AiProviderService {
    private static final Logger logger = LoggerFactory.getLogger(OpenAiCompatibleAiProviderService.class);

    private final AiProperties aiProperties;
    private final RestClient aiRestClient;
    private final ObjectMapper objectMapper;

    public OpenAiCompatibleAiProviderService(AiProperties aiProperties, RestClient aiRestClient, ObjectMapper objectMapper) {
        this.aiProperties = aiProperties;
        this.aiRestClient = aiRestClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean isAvailable() {
        return aiProperties.isProviderEnabled()
                && aiProperties.getApiKey() != null
                && !aiProperties.getApiKey().isBlank()
                && aiProperties.getBaseUrl() != null
                && !aiProperties.getBaseUrl().isBlank();
    }

    @Override
    public Optional<String> composeAnswer(AiIntent intent,
                                          String locale,
                                          String userMessage,
                                          List<String> facts,
                                          String fallbackAnswer) {
        if (!isAvailable()) {
            return Optional.empty();
        }

        try {
            String factBlock = facts == null || facts.isEmpty()
                    ? "- No additional facts available."
                    : facts.stream().map(item -> "- " + item).reduce((left, right) -> left + "\n" + right).orElse("");

            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of(
                    "role", "system",
                    "content", buildSystemPrompt(locale)
            ));
            messages.add(Map.of(
                    "role", "user",
                    "content", "Intent: " + intent.name() + "\n"
                            + "User message: " + userMessage + "\n"
                            + "Grounding facts:\n" + factBlock + "\n"
                            + "Fallback answer:\n" + fallbackAnswer
            ));

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", aiProperties.getModel());
            payload.put("temperature", 0.2);
            payload.put("max_tokens", 220);
            payload.put("messages", messages);

            String responseBody = aiRestClient.post()
                    .uri("/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + aiProperties.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            if (responseBody == null || responseBody.isBlank()) {
                return Optional.empty();
            }

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
            String content = contentNode.asText("").trim();
            return content.isEmpty() ? Optional.empty() : Optional.of(content);
        } catch (Exception exception) {
            logger.warn("AI provider request failed: {}", exception.getMessage());
            return Optional.empty();
        }
    }

    private String buildSystemPrompt(String locale) {
        boolean vietnamese = locale != null && locale.toLowerCase().startsWith("vi");
        if (vietnamese) {
            return """
                    Ban la tro ly Moviex + JDWoMoviex Cinema.
                    Chi duoc tra loi trong pham vi phim, lich chieu, ghe, dat ve, ve, goi dang ky, thanh toan va ho tro nen tang.
                    Chi duoc dung cac thong tin duoc cung cap trong grounding facts.
                    Neu khong co du lieu, phai noi ro khong co du lieu va huong nguoi dung den trang hoac buoc tiep theo.
                    Khong duoc bo sung du lieu moi, khong doan trang thai truc tiep.
                    Tra loi ngan gon, toi da 100 tu.
                    """;
        }

        return """
                You are the Moviex + JDWoMoviex Cinema assistant.
                Answer only within movies, showtimes, seats, bookings, tickets, subscriptions, payments, and platform support.
                Use only the provided grounding facts.
                If data is missing, say so clearly and guide the user to the correct page or next step.
                Do not invent live data or extra facts.
                Keep the answer concise and under 100 words.
                """;
    }
}
