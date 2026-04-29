package com.moviex.ai.service;

import com.moviex.ai.model.AiIntent;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Locale;

@Service
public class AiIntentRouter {

    public AiIntent resolveIntent(String message) {
        String normalized = normalize(message);

        if (containsAny(normalized, "upcoming ticket", "my ticket", "show my ticket", "ticket sap toi", "ve sap toi", "ve cua toi")) {
            return AiIntent.UPCOMING_TICKETS;
        }
        if (containsAny(normalized, "premium", "goi premium", "premium gom", "premium bao gom", "included in premium")) {
            return AiIntent.PREMIUM_BENEFITS;
        }
        if (containsAny(normalized, "payment fail", "payment failed", "failed payment", "thanh toan that bai", "tai sao thanh toan", "why did my payment")) {
            return AiIntent.PAYMENT_FAILURE;
        }
        if (containsAny(normalized, "seat", "ghe") && containsAny(normalized, "2 people", "two people", "2 nguoi", "cap doi", "best", "tot nhat")) {
            return AiIntent.SEAT_RECOMMENDATION;
        }
        if (containsAny(normalized, "showing tonight", "tonight", "toi nay", "lich chieu toi nay", "movies are showing")) {
            return AiIntent.SHOWTIME_LOOKUP;
        }
        if (containsAny(normalized, "recommend", "goi y", "de xuat")) {
            return AiIntent.MOVIE_RECOMMENDATION;
        }
        if (containsAny(normalized, "book ticket", "book tickets", "dat ve", "help me book", "booking help")) {
            return AiIntent.BOOKING_HELP;
        }
        if (containsAny(normalized, "manage my subscription", "manage subscription", "quan ly goi", "goi dang ky o dau", "subscription")) {
            return AiIntent.SUBSCRIPTION_SUPPORT;
        }
        if (containsAny(normalized, "moviex", "cinema", "showtime", "ticket", "booking", "subscription", "payment", "movie", "phim", "rap", "ve", "thanh toan")) {
            return AiIntent.PLATFORM_HELP;
        }
        return AiIntent.OFF_SCOPE;
    }

    private boolean containsAny(String text, String... candidates) {
        for (String candidate : candidates) {
            if (text.contains(candidate)) {
                return true;
            }
        }
        return false;
    }

    private String normalize(String value) {
        String lower = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return Normalizer.normalize(lower, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
