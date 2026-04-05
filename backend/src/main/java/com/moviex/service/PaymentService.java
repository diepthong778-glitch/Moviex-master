package com.moviex.service;

import com.moviex.dto.PaymentEntitlementsResponse;
import com.moviex.dto.PaymentConfirmRequest;
import com.moviex.dto.PaymentCreateRequest;
import com.moviex.dto.PaymentTransactionResponse;

public interface PaymentService {
    PaymentTransactionResponse createPayment(PaymentCreateRequest request);
    PaymentTransactionResponse getTransactionByTxnCode(String txnCode);
    PaymentTransactionResponse markPaymentSuccess(PaymentConfirmRequest request);
    PaymentTransactionResponse markPaymentFailed(PaymentConfirmRequest request);
    PaymentEntitlementsResponse getCurrentEntitlements();
}
