package com.moviex.controller;

import com.moviex.dto.PaymentConfirmRequest;
import com.moviex.dto.PaymentCreateRequest;
import com.moviex.dto.PaymentEntitlementsResponse;
import com.moviex.dto.PaymentTransactionResponse;
import com.moviex.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/transactions")
    public ResponseEntity<PaymentTransactionResponse> createPayment(@RequestBody PaymentCreateRequest request) {
        return ResponseEntity.ok(paymentService.createPayment(request));
    }

    @GetMapping("/public/transactions/{txnCode}")
    public ResponseEntity<PaymentTransactionResponse> getTransaction(@PathVariable String txnCode) {
        return ResponseEntity.ok(paymentService.getTransactionByTxnCode(txnCode));
    }

    @PostMapping("/public/transactions/{txnCode}/confirm")
    public ResponseEntity<PaymentTransactionResponse> confirmPayment(@PathVariable String txnCode) {
        PaymentConfirmRequest request = new PaymentConfirmRequest();
        request.setTxnCode(txnCode);
        return ResponseEntity.ok(paymentService.markPaymentSuccess(request));
    }

    @PostMapping("/public/transactions/{txnCode}/fail")
    public ResponseEntity<PaymentTransactionResponse> failPayment(@PathVariable String txnCode) {
        PaymentConfirmRequest request = new PaymentConfirmRequest();
        request.setTxnCode(txnCode);
        return ResponseEntity.ok(paymentService.markPaymentFailed(request));
    }

    @GetMapping("/entitlements/me")
    public ResponseEntity<PaymentEntitlementsResponse> getEntitlements() {
        return ResponseEntity.ok(paymentService.getCurrentEntitlements());
    }
}
