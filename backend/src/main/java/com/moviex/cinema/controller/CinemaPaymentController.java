package com.moviex.cinema.controller;

import com.moviex.cinema.dto.BookingResponse;
import com.moviex.cinema.dto.CinemaPaymentTransactionResponse;
import com.moviex.cinema.dto.CreatePaymentRequest;
import com.moviex.cinema.service.CinemaPaymentService;
import jakarta.validation.Valid;
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
    public ResponseEntity<BookingResponse> createPayment(@Valid @RequestBody CreatePaymentRequest request) {
        return ResponseEntity.ok(paymentService.createPayment(request));
    }

    @GetMapping("/public/transactions/{txnCode}")
    public ResponseEntity<CinemaPaymentTransactionResponse> getPublicPaymentTransaction(@PathVariable String txnCode) {
        return ResponseEntity.ok(paymentService.getPublicPaymentTransaction(txnCode));
    }

    @PostMapping("/public/transactions/{txnCode}/confirm")
    public ResponseEntity<CinemaPaymentTransactionResponse> confirmPaymentPublic(@PathVariable String txnCode) {
        return ResponseEntity.ok(paymentService.confirmPaymentPublic(txnCode));
    }

    @PostMapping("/public/transactions/{txnCode}/fail")
    public ResponseEntity<CinemaPaymentTransactionResponse> failPaymentPublic(@PathVariable String txnCode) {
        return ResponseEntity.ok(paymentService.failPaymentPublic(txnCode));
    }

    @PostMapping("/confirm")
    public ResponseEntity<BookingResponse> confirmPayment(
            @RequestParam String txnCode,
            @RequestParam(defaultValue = "true") boolean success) {
        return ResponseEntity.ok(paymentService.confirmPayment(txnCode, success));
    }
}
