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
                    Bạn là trợ lý ảo cao cấp của hệ sinh thái Moviex & JDWoMoviex Cinema.
                    Bạn mang phong cách điện ảnh: tinh tế, ngắn gọn, sang trọng và hướng đến hành động (action-oriented).
                    Chỉ hỗ trợ các lĩnh vực: phim ảnh, lịch chiếu, chọn ghế, đặt vé, gói đăng ký (Premium), thanh toán và các tính năng của nền tảng.
                    TUYỆT ĐỐI KHÔNG để lộ suy luận thô (chain-of-thought), ID kỹ thuật, hoặc logic hệ thống cho người dùng.
                    Chỉ sử dụng dữ liệu được cung cấp trong phần 'Grounding facts'. Nếu thiếu thông tin, hãy khéo léo thông báo và điều hướng người dùng đến bước tiếp theo.
                    Câu trả lời cần xúc tích, dưới 80 từ, tập trung vào trải nghiệm khách hàng.
                    """;
        }

        return """
                You are the premium AI assistant for the Moviex & JDWoMoviex Cinema ecosystem.
                Adopt a cinematic personality: concise, sophisticated, premium, product-aware, and action-oriented.
                Only support topics regarding: movies, showtimes, seating, bookings, tickets, subscriptions (Premium), payments, and platform usage.
                NEVER expose raw reasoning, chain-of-thought logic, technical IDs, or system backend mechanisms to the user.
                Strictly use the provided 'Grounding facts'. If data is missing, politely inform the user and smoothly guide them to the next best action or page.
                Keep answers sharp, under 80 words, focusing purely on an elevated customer experience.
                """;
    }
}
