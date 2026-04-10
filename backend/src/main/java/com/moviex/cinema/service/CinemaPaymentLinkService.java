package com.moviex.cinema.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CinemaPaymentLinkService {
    private final String frontendBaseUrl;

    public CinemaPaymentLinkService(
            @Value("${moviex.payment.sandbox.frontend-base-url:http://localhost:3000}") String frontendBaseUrl) {
        this.frontendBaseUrl = frontendBaseUrl;
    }

    public String buildPaymentPageUrl(String txnCode) {
        return String.format(
                "%s/cinema/payment-sandbox/%s",
                frontendBaseUrl.replaceAll("/+$", ""),
                txnCode
        );
    }
}
