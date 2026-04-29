package com.moviex.ai.service;

import com.moviex.ai.model.AiIntent;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AiIntentRouterTest {
    private final AiIntentRouter aiIntentRouter = new AiIntentRouter();

    @Test
    void resolvesMovieRecommendationIntent() {
        assertEquals(AiIntent.MOVIE_RECOMMENDATION, aiIntentRouter.resolveIntent("recommend me a thriller movie"));
    }

    @Test
    void resolvesShowtimeLookupIntent() {
        assertEquals(AiIntent.SHOWTIME_LOOKUP, aiIntentRouter.resolveIntent("what movies are showing tonight?"));
    }

    @Test
    void resolvesSeatRecommendationIntent() {
        assertEquals(AiIntent.SEAT_RECOMMENDATION, aiIntentRouter.resolveIntent("which seats are best for 2 people?"));
    }

    @Test
    void resolvesSubscriptionSupportIntent() {
        assertEquals(AiIntent.SUBSCRIPTION_SUPPORT, aiIntentRouter.resolveIntent("where do I manage my subscription?"));
    }
}
