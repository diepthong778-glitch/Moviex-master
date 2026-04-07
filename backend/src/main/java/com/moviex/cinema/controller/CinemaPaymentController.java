package com.moviex.cinema.controller;

import com.moviex.cinema.dto.BookingResponse;
import com.moviex.cinema.dto.CreatePaymentRequest;
import com.moviex.cinema.service.CinemaPaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cinema/payments")
public class CinemaPaymentController {
    private final CinemaPaymentService paymentService;

    public CinemaPaymentController(CinemaPaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    public ResponseEntity<BookingResponse> createPayment(@RequestBody CreatePaymentRequest request) {
        return ResponseEntity.ok(paymentService.createPayment(request));
    }

    @PostMapping("/confirm")
    public ResponseEntity<BookingResponse> confirmPayment(
            @RequestParam String txnCode,
            @RequestParam(defaultValue = "true") boolean success) {
        return ResponseEntity.ok(paymentService.confirmPayment(txnCode, success));
    }
}
