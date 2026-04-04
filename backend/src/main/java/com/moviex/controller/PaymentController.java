package com.moviex.controller;

import com.moviex.dto.PaymentConfirmRequest;
import com.moviex.dto.PaymentCreateRequest;
import com.moviex.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createPayment(@RequestBody PaymentCreateRequest request) {
        return ResponseEntity.ok(paymentService.createPayment(request));
    }

    @PostMapping("/confirm")
    public ResponseEntity<Map<String, Object>> confirmPayment(@RequestBody PaymentConfirmRequest request) {
        return ResponseEntity.ok(paymentService.markPaymentSuccess(request));
    }
}
