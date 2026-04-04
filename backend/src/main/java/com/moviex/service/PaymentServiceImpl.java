package com.moviex.service;

import com.moviex.dto.PaymentConfirmRequest;
import com.moviex.dto.PaymentCreateRequest;
import com.moviex.dto.SubscriptionResponse;
import com.moviex.model.Payment;
import com.moviex.model.PaymentMethod;
import com.moviex.model.PaymentStatus;
import com.moviex.model.SubscriptionPlan;
import com.moviex.model.User;
import com.moviex.repository.PaymentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final CurrentUserService currentUserService;
    private final SubscriptionService subscriptionService;

    public PaymentServiceImpl(PaymentRepository paymentRepository,
                              CurrentUserService currentUserService,
                              SubscriptionService subscriptionService) {
        this.paymentRepository = paymentRepository;
        this.currentUserService = currentUserService;
        this.subscriptionService = subscriptionService;
    }

    @Override
    public Map<String, Object> createPayment(PaymentCreateRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        SubscriptionPlan planType = request.getPlanType();
        if (planType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "planType is required");
        }

        subscriptionService.createSubscription(currentUser.getId(), planType);

        Payment payment = new Payment();
        payment.setUserId(currentUser.getId());
        payment.setPlanType(planType);
        payment.setAmount(request.getAmount() != null ? request.getAmount() : defaultAmount(planType));
        payment.setStatus(PaymentStatus.PENDING);
        payment.setPaymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : PaymentMethod.QR);

        Payment saved = paymentRepository.save(payment);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("paymentId", saved.getId());
        response.put("userId", saved.getUserId());
        response.put("planType", saved.getPlanType());
        response.put("amount", saved.getAmount());
        response.put("status", saved.getStatus());
        response.put("paymentMethod", saved.getPaymentMethod());
        response.put("createdAt", saved.getCreatedAt());
        response.put("qrCodeUrl", "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=MOVIEX-" + saved.getId());
        return response;
    }

    @Override
    public Map<String, Object> markPaymentSuccess(PaymentConfirmRequest request) {
        if (request.getPaymentId() == null || request.getPaymentId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "paymentId is required");
        }

        User currentUser = currentUserService.getCurrentUser();
        Payment payment = paymentRepository.findById(request.getPaymentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));

        if (!payment.getUserId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to confirm this payment");
        }

        payment.setStatus(PaymentStatus.SUCCESS);
        paymentRepository.save(payment);

        SubscriptionResponse subscription = subscriptionService.activateSubscription(currentUser.getId(), payment.getPlanType());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("paymentId", payment.getId());
        response.put("status", payment.getStatus());
        response.put("subscription", subscription);
        response.put("message", "Payment confirmed and subscription activated");
        return response;
    }

    private BigDecimal defaultAmount(SubscriptionPlan planType) {
        return switch (planType) {
            case BASIC -> new BigDecimal("5");
            case STANDARD -> new BigDecimal("10");
            case PREMIUM -> new BigDecimal("20");
        };
    }
}
