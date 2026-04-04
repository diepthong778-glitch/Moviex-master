package com.moviex.service;

import com.moviex.dto.PaymentConfirmRequest;
import com.moviex.dto.PaymentCreateRequest;

import java.util.Map;

public interface PaymentService {
    Map<String, Object> createPayment(PaymentCreateRequest request);
    Map<String, Object> markPaymentSuccess(PaymentConfirmRequest request);
}
