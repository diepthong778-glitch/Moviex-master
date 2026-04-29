package com.moviex.ai.controller;

import com.moviex.ai.dto.AiAssistantRequest;
import com.moviex.ai.dto.AiAssistantResponse;
import com.moviex.ai.service.AiAssistantService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiController {
    private final AiAssistantService aiAssistantService;

    public AiController(AiAssistantService aiAssistantService) {
        this.aiAssistantService = aiAssistantService;
    }

    @PostMapping("/chat")
    public ResponseEntity<AiAssistantResponse> chat(@Valid @RequestBody AiAssistantRequest request) {
        return ResponseEntity.ok(aiAssistantService.handle(request));
    }
}
