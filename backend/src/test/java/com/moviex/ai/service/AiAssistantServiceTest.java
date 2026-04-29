package com.moviex.ai.service;

import com.moviex.ai.dto.AiAssistantContext;
import com.moviex.ai.dto.AiAssistantRequest;
import com.moviex.ai.dto.AiAssistantResponse;
import com.moviex.ai.model.AiIntent;
import com.moviex.dto.MovieDto;
import com.moviex.model.SubscriptionPlan;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiAssistantServiceTest {
    @Mock
    private AiIntentRouter aiIntentRouter;
    @Mock
    private AiProviderService aiProviderService;
    @Mock
    private AiMovieAdapterService aiMovieAdapterService;
    @Mock
    private AiCinemaAdapterService aiCinemaAdapterService;
    @Mock
    private AiAccountAdapterService aiAccountAdapterService;

    private AiAssistantService aiAssistantService;

    @BeforeEach
    void setUp() {
        aiAssistantService = new AiAssistantService(
                aiIntentRouter,
                aiProviderService,
                aiMovieAdapterService,
                aiCinemaAdapterService,
                aiAccountAdapterService
        );
        when(aiProviderService.composeAnswer(any(), anyString(), anyString(), anyList(), anyString()))
                .thenReturn(Optional.empty());
    }

    @Test
    void requiresAuthenticationForUpcomingTickets() {
        when(aiIntentRouter.resolveIntent(anyString())).thenReturn(AiIntent.UPCOMING_TICKETS);
        when(aiAccountAdapterService.getCurrentUserOptional()).thenReturn(Optional.empty());

        AiAssistantResponse response = aiAssistantService.handle(buildRequest("show my upcoming tickets"));

        assertEquals("UPCOMING_TICKETS", response.getIntent());
        assertTrue(response.isRequiresAuth());
        assertEquals("/login", response.getHandoffPath());
        assertEquals("private-account", response.getSource());
    }

    @Test
    void fallsBackToMovieSelectionWhenSeatRecommendationLacksShowtime() {
        when(aiIntentRouter.resolveIntent(anyString())).thenReturn(AiIntent.SEAT_RECOMMENDATION);

        AiAssistantRequest request = buildRequest("which seats are best for 2 people?");
        request.setContext(new AiAssistantContext());

        AiAssistantResponse response = aiAssistantService.handle(request);

        assertEquals("SEAT_RECOMMENDATION", response.getIntent());
        assertFalse(response.isRequiresAuth());
        assertEquals("/cinema/now-showing", response.getHandoffPath());
        assertEquals("cinema-seats", response.getSource());
    }

    @Test
    void returnsStructuredMovieRecommendationCards() {
        when(aiIntentRouter.resolveIntent(anyString())).thenReturn(AiIntent.MOVIE_RECOMMENDATION);
        when(aiMovieAdapterService.findRecommendedMovies(anyString(), anyInt())).thenReturn(List.of(
                new MovieDto(
                        "mvx-001",
                        "Night Drive",
                        "Thriller",
                        2024,
                        "A grounded thriller in the current Moviex catalog.",
                        "",
                        "",
                        SubscriptionPlan.STANDARD
                )
        ));

        AiAssistantResponse response = aiAssistantService.handle(buildRequest("recommend me a thriller movie"));

        assertEquals("movie-catalog", response.getSource());
        assertEquals(1, response.getCards().size());
        assertEquals("Night Drive", response.getCards().get(0).getTitle());
        assertEquals("/browse?play=mvx-001", response.getCards().get(0).getActionPath());
    }

    private AiAssistantRequest buildRequest(String message) {
        AiAssistantRequest request = new AiAssistantRequest();
        request.setMessage(message);
        request.setLocale("en");
        request.setContext(new AiAssistantContext());
        return request;
    }
}
