package com.moviex.controller;

import com.moviex.dto.SubscribeRequest;
import com.moviex.dto.PlanSelectionRequest;
import com.moviex.dto.SubscriptionResponse;
import com.moviex.service.SubscriptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @GetMapping("/subscription")
    public ResponseEntity<Map<String, Object>> getSubscription() {
        return ResponseEntity.ok(subscriptionService.getCurrentSubscription());
    }

    @GetMapping("/subscription/me")
    public ResponseEntity<SubscriptionResponse> getMySubscription() {
        return ResponseEntity.ok(subscriptionService.getCurrentUserSubscription());
    }

    @PostMapping("/subscription/select-plan")
    public ResponseEntity<SubscriptionResponse> selectPlan(@RequestBody PlanSelectionRequest request) {
        if (request.getPlanType() == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(
                subscriptionService.createSubscription(subscriptionService.getCurrentUserSubscription().getUserId(), request.getPlanType())
        );
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Map<String, Object>> subscribe(@RequestBody SubscribeRequest request) {
        return ResponseEntity.ok(subscriptionService.subscribe(request));
    }
}
