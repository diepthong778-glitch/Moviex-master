package com.moviex.ai.service;

import com.moviex.ai.dto.AiAssistantCard;
import com.moviex.ai.dto.AiAssistantContext;
import com.moviex.ai.dto.AiAssistantRequest;
import com.moviex.ai.dto.AiAssistantResponse;
import com.moviex.ai.model.AiIntent;
import com.moviex.cinema.dto.CinemaTicketViewResponse;
import com.moviex.cinema.dto.SeatAvailabilityResponse;
import com.moviex.cinema.dto.ShowtimeViewResponse;
import com.moviex.dto.MovieDto;
import com.moviex.dto.SubscriptionResponse;
import com.moviex.model.SubscriptionPlan;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class AiAssistantService {
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private final AiIntentRouter aiIntentRouter;
    private final AiProviderService aiProviderService;
    private final AiMovieAdapterService aiMovieAdapterService;
    private final AiCinemaAdapterService aiCinemaAdapterService;
    private final AiAccountAdapterService aiAccountAdapterService;

    public AiAssistantService(AiIntentRouter aiIntentRouter,
                              AiProviderService aiProviderService,
                              AiMovieAdapterService aiMovieAdapterService,
                              AiCinemaAdapterService aiCinemaAdapterService,
                              AiAccountAdapterService aiAccountAdapterService) {
        this.aiIntentRouter = aiIntentRouter;
        this.aiProviderService = aiProviderService;
        this.aiMovieAdapterService = aiMovieAdapterService;
        this.aiCinemaAdapterService = aiCinemaAdapterService;
        this.aiAccountAdapterService = aiAccountAdapterService;
    }

    public AiAssistantResponse handle(AiAssistantRequest request) {
        String locale = resolveLocale(request);
        boolean vietnamese = isVietnamese(locale);
        AiIntent intent = aiIntentRouter.resolveIntent(request.getMessage());

        try {
            AnswerBundle bundle = switch (intent) {
                case MOVIE_RECOMMENDATION -> buildMovieRecommendation(request, vietnamese);
                case SHOWTIME_LOOKUP -> buildTonightShowtimes(vietnamese);
                case SEAT_RECOMMENDATION -> buildSeatRecommendation(request, vietnamese);
                case UPCOMING_TICKETS -> buildUpcomingTickets(vietnamese);
                case PREMIUM_BENEFITS -> buildPremiumBenefits(vietnamese);
                case PAYMENT_FAILURE -> buildPaymentFailure(vietnamese);
                case BOOKING_HELP -> buildBookingHelp(request, vietnamese);
                case SUBSCRIPTION_SUPPORT -> buildSubscriptionSupport(vietnamese);
                case PLATFORM_HELP -> buildPlatformHelp(request, vietnamese);
                case OFF_SCOPE -> buildOffScope(vietnamese);
            };
            return toResponse(intent, locale, request.getMessage(), bundle);
        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode().value() == HttpStatus.UNAUTHORIZED.value()) {
                return toResponse(intent, locale, request.getMessage(), buildAuthRequiredBundle(vietnamese));
            }
            return toResponse(intent, locale, request.getMessage(), buildSafeFallback(vietnamese));
        } catch (Exception exception) {
            return toResponse(intent, locale, request.getMessage(), buildSafeFallback(vietnamese));
        }
    }

    private AnswerBundle buildMovieRecommendation(AiAssistantRequest request, boolean vietnamese) {
        List<MovieDto> matches = aiMovieAdapterService.findRecommendedMovies(request.getMessage(), 3);
        if (matches.isEmpty()) {
            matches = aiMovieAdapterService.listCatalogSample(3);
        }

        if (matches.isEmpty()) {
            return new AnswerBundle(
                    "movie-catalog",
                    vietnamese
                            ? "Minh chua co du lieu phim de goi y luc nay. Ban co the mo Browse de xem toan bo catalog."
                            : "I do not have movie catalog data to recommend right now. Open Browse to view the full catalog.",
                    List.of(
                            suggestion(vietnamese, "What movies are showing tonight?", "Toi nay co phim nao dang chieu?"),
                            suggestion(vietnamese, "What is included in Premium?", "Premium gom nhung gi?")
                    ),
                    List.of(),
                    false,
                    "/browse",
                    label(vietnamese, "Open Browse", "Mo Browse"),
                    List.of("Movie catalog is empty.")
            );
        }

        List<String> titles = matches.stream().map(MovieDto::getTitle).toList();
        return new AnswerBundle(
                "movie-catalog",
                vietnamese
                        ? "Goi y phu hop nhat hien tai: " + String.join(", ", titles) + ". Minh uu tien theo the loai va mo ta trong catalog hien co."
                        : "Best matches right now: " + String.join(", ", titles) + ". I prioritized genre and description matches from the current catalog.",
                List.of(
                        suggestion(vietnamese, "What movies are showing tonight?", "Toi nay co phim nao dang chieu?"),
                        suggestion(vietnamese, "Help me book tickets", "Huong dan dat ve")
                ),
                matches.stream().map(movie -> buildMovieCard(movie, vietnamese)).toList(),
                false,
                "/browse",
                label(vietnamese, "Open Browse", "Mo Browse"),
                matches.stream()
                        .map(movie -> "Movie: " + movie.getTitle() + " | Genre: " + safe(movie.getGenre()) + " | Plan: " + safePlan(movie.getRequiredSubscription()))
                        .toList()
        );
    }

    private AnswerBundle buildTonightShowtimes(boolean vietnamese) {
        List<ShowtimeViewResponse> showtimes = aiCinemaAdapterService.listTonightShowtimes(4);
        if (showtimes.isEmpty()) {
            return new AnswerBundle(
                    "cinema-showtimes",
                    vietnamese
                            ? "Hien tai minh khong thay suat chieu toi nay. Ban hay mo lich chieu de xem ngay khac hoac cum rap khac."
                            : "I cannot find showtimes for tonight right now. Open the schedule page to check other dates or cinemas.",
                    List.of(
                            suggestion(vietnamese, "Help me book tickets", "Huong dan dat ve"),
                            suggestion(vietnamese, "Which seats are best for 2 people?", "Ghe nao tot cho 2 nguoi?")
                    ),
                    List.of(),
                    false,
                    "/cinema/schedule",
                    label(vietnamese, "Open Schedule", "Mo lich chieu"),
                    List.of("No qualifying showtimes were returned for tonight.")
            );
        }

        ShowtimeViewResponse first = showtimes.get(0);
        return new AnswerBundle(
                "cinema-showtimes",
                vietnamese
                        ? "Toi nay co " + showtimes.size() + " suat chieu phu hop. Suat som nhat la " + safe(first.getMovieTitle()) + " luc " + formatTime(first.getStartTime()) + " tai " + safe(first.getCinemaName()) + "."
                        : "I found " + showtimes.size() + " strong showtime options tonight. The earliest is " + safe(first.getMovieTitle()) + " at " + formatTime(first.getStartTime()) + " in " + safe(first.getCinemaName()) + ".",
                List.of(
                        suggestion(vietnamese, "Which seats are best for 2 people?", "Ghe nao tot cho 2 nguoi?"),
                        suggestion(vietnamese, "Show my upcoming tickets", "Cho xem ve sap toi")
                ),
                showtimes.stream().map(showtime -> buildShowtimeCard(showtime, vietnamese)).toList(),
                false,
                "/cinema/schedule",
                label(vietnamese, "Open Schedule", "Mo lich chieu"),
                showtimes.stream()
                        .map(showtime -> "Showtime: " + safe(showtime.getMovieTitle()) + " | " + safe(showtime.getCinemaName()) + " | " + formatDate(showtime.getShowDate()) + " " + formatTime(showtime.getStartTime()))
                        .toList()
        );
    }

    private AnswerBundle buildSeatRecommendation(AiAssistantRequest request, boolean vietnamese) {
        String showtimeId = Optional.ofNullable(request.getContext()).map(AiAssistantContext::getShowtimeId).orElse(null);
        if (showtimeId == null || showtimeId.isBlank()) {
            return new AnswerBundle(
                    "cinema-seats",
                    vietnamese
                            ? "De goi y ghe tot cho 2 nguoi, minh can biet suat chieu cu the. Hay chon phim va suat chieu truoc."
                            : "To recommend the best seats for 2 people, I need a specific showtime. Choose a movie and showtime first.",
                    List.of(
                            suggestion(vietnamese, "What movies are showing tonight?", "Toi nay co phim nao dang chieu?"),
                            suggestion(vietnamese, "Help me book tickets", "Huong dan dat ve")
                    ),
                    List.of(),
                    false,
                    "/cinema/now-showing",
                    label(vietnamese, "Choose a Movie", "Chon phim"),
                    List.of("Seat recommendation requires a showtimeId.")
            );
        }

        List<AiCinemaAdapterService.SeatPairRecommendation> pairs = aiCinemaAdapterService.recommendSeatPairs(showtimeId, 3);
        if (pairs.isEmpty()) {
            return new AnswerBundle(
                    "cinema-seats",
                    vietnamese
                            ? "Minh khong thay cap ghe trong lien nhau cho suat nay. Hay thu suat chieu khac hoac mo so do ghe de tu chon."
                            : "I could not find an available adjacent pair for this showtime. Try another showtime or open the seat map to choose manually.",
                    List.of(
                            suggestion(vietnamese, "Help me book tickets", "Huong dan dat ve"),
                            suggestion(vietnamese, "What movies are showing tonight?", "Toi nay co phim nao dang chieu?")
                    ),
                    List.of(),
                    false,
                    "/cinema/seats",
                    label(vietnamese, "Open Seats", "Mo so do ghe"),
                    List.of("No adjacent available seat pairs were found.")
            );
        }

        AiCinemaAdapterService.SeatPairRecommendation top = pairs.get(0);
        return new AnswerBundle(
                "cinema-seats",
                vietnamese
                        ? "Cap ghe de xuat tot nhat la " + aiCinemaAdapterService.buildSeatLabel(top.left()) + " - " + aiCinemaAdapterService.buildSeatLabel(top.right()) + ". Minh uu tien hang giua va vi tri can doi."
                        : "Best pair recommendation is " + aiCinemaAdapterService.buildSeatLabel(top.left()) + " - " + aiCinemaAdapterService.buildSeatLabel(top.right()) + ". I prioritized centered rows and balanced positioning.",
                List.of(
                        suggestion(vietnamese, "Help me book tickets", "Huong dan dat ve"),
                        suggestion(vietnamese, "Show my upcoming tickets", "Cho xem ve sap toi")
                ),
                pairs.stream().map(pair -> buildSeatPairCard(pair, vietnamese)).toList(),
                false,
                "/cinema/seats",
                label(vietnamese, "Open Seats", "Mo so do ghe"),
                pairs.stream()
                        .map(pair -> "Seat pair: " + aiCinemaAdapterService.buildSeatLabel(pair.left()) + "-" + aiCinemaAdapterService.buildSeatLabel(pair.right()) + " | Type: " + safe(pair.left().getType()))
                        .toList()
        );
    }

    private AnswerBundle buildUpcomingTickets(boolean vietnamese) {
        if (aiAccountAdapterService.getCurrentUserOptional().isEmpty()) {
            return buildAuthRequiredBundle(vietnamese);
        }

        List<CinemaTicketViewResponse> tickets = aiAccountAdapterService.listUpcomingTickets().stream()
                .sorted(Comparator.comparing(CinemaTicketViewResponse::getShowDate, Comparator.nullsLast(LocalDate::compareTo)))
                .limit(3)
                .toList();

        if (tickets.isEmpty()) {
            return new AnswerBundle(
                    "cinema-tickets",
                    vietnamese
                            ? "Tai khoan cua ban hien chua co ve sap toi. Ban co the mo Now Showing de dat ve moi."
                            : "Your account does not have upcoming tickets right now. Open Now Showing to book a new ticket.",
                    List.of(
                            suggestion(vietnamese, "What movies are showing tonight?", "Toi nay co phim nao dang chieu?"),
                            suggestion(vietnamese, "Help me book tickets", "Huong dan dat ve")
                    ),
                    List.of(),
                    false,
                    "/cinema/now-showing",
                    label(vietnamese, "Book Tickets", "Dat ve"),
                    List.of("No upcoming tickets were returned for the current user.")
            );
        }

        CinemaTicketViewResponse first = tickets.get(0);
        return new AnswerBundle(
                "cinema-tickets",
                vietnamese
                        ? "Ban co " + tickets.size() + " ve sap toi. Suat sap nhat la " + safe(first.getMovieTitle()) + " vao " + formatDate(first.getShowDate()) + " luc " + formatTime(first.getStartTime()) + "."
                        : "You have " + tickets.size() + " upcoming ticket(s). The nearest one is " + safe(first.getMovieTitle()) + " on " + formatDate(first.getShowDate()) + " at " + formatTime(first.getStartTime()) + ".",
                List.of(
                        suggestion(vietnamese, "Why did my payment fail?", "Vi sao thanh toan cua minh that bai?"),
                        suggestion(vietnamese, "Where do I manage my subscription?", "Quan ly goi dang ky o dau?")
                ),
                tickets.stream().map(ticket -> buildTicketCard(ticket, vietnamese)).toList(),
                false,
                "/cinema/tickets",
                label(vietnamese, "Open My Tickets", "Mo ve cua toi"),
                tickets.stream()
                        .map(ticket -> "Ticket: " + safe(ticket.getMovieTitle()) + " | " + formatDate(ticket.getShowDate()) + " " + formatTime(ticket.getStartTime()) + " | Seats: " + String.join(", ", ticket.getSeats()))
                        .toList()
        );
    }

    private AnswerBundle buildPremiumBenefits(boolean vietnamese) {
        Optional<?> currentUser = aiAccountAdapterService.getCurrentUserOptional();
        SubscriptionResponse currentSubscription = null;
        if (currentUser.isPresent()) {
            try {
                currentSubscription = aiAccountAdapterService.getCurrentSubscription();
            } catch (ResponseStatusException exception) {
                if (exception.getStatusCode().value() != HttpStatus.UNAUTHORIZED.value()) {
                    throw exception;
                }
            }
        }

        AiAccountAdapterService.PlanDetails premium = aiAccountAdapterService.getPlanDetails(SubscriptionPlan.PREMIUM);
        List<String> features = vietnamese ? premium.featuresVi() : premium.featuresEn();
        AiAssistantCard card = new AiAssistantCard();
        card.setType("plan");
        card.setTitle("Premium");
        card.setSubtitle(formatAmount(premium.price()) + (vietnamese ? " / thang" : " / month"));
        card.setDescription(vietnamese
                ? "Day la goi streaming cao nhat hien co tren Moviex."
                : "This is the highest streaming plan currently available on Moviex.");
        card.setDetails(features);
        card.setBadges(List.of(
                label(vietnamese, "Streaming", "Streaming"),
                currentSubscription != null && aiAccountAdapterService.isSubscriptionActive(currentSubscription)
                        ? label(vietnamese, "Current plan detected", "Da kiem tra goi hien tai")
                        : label(vietnamese, "Upgrade available", "Co the nang cap")
        ));
        card.setActionPath(currentSubscription != null ? "/subscription" : "/plans");
        card.setActionLabel(currentSubscription != null
                ? label(vietnamese, "Open Subscription", "Mo goi dang ky")
                : label(vietnamese, "View Plans", "Xem goi"));

        List<String> facts = new ArrayList<>();
        facts.add("Premium price: " + formatAmount(premium.price()));
        features.forEach(feature -> facts.add("Feature: " + feature));
        if (currentSubscription != null) {
            facts.add("Current subscription: " + safePlan(currentSubscription.getPlanType()) + " | Status: " + safe(currentSubscription.getStatus()));
        }

        return new AnswerBundle(
                "subscription-plan",
                currentSubscription != null && aiAccountAdapterService.isSubscriptionActive(currentSubscription)
                        ? (vietnamese
                            ? "Premium gom " + String.join(", ", features) + ". Tai khoan cua ban hien dang co goi " + safePlan(currentSubscription.getPlanType()) + "."
                            : "Premium includes " + String.join(", ", features) + ". Your account currently has the " + safePlan(currentSubscription.getPlanType()) + " plan.")
                        : (vietnamese
                            ? "Premium gom " + String.join(", ", features) + ". Neu ban muon nang cap, hay mo trang Plans."
                            : "Premium includes " + String.join(", ", features) + ". If you want to upgrade, open the Plans page."),
                List.of(
                        suggestion(vietnamese, "Where do I manage my subscription?", "Quan ly goi dang ky o dau?"),
                        suggestion(vietnamese, "Recommend me a thriller movie", "Goi y phim thriller cho minh")
                ),
                List.of(card),
                false,
                currentSubscription != null ? "/subscription" : "/plans",
                currentSubscription != null
                        ? label(vietnamese, "Open Subscription", "Mo goi dang ky")
                        : label(vietnamese, "View Plans", "Xem goi"),
                facts
        );
    }

    private AnswerBundle buildPaymentFailure(boolean vietnamese) {
        if (aiAccountAdapterService.getCurrentUserOptional().isEmpty()) {
            return new AnswerBundle(
                    "payment-transactions",
                    vietnamese
                            ? "Minh can dang nhap de kiem tra giao dich thanh toan gan nhat cua ban. Neu khong co du lieu tai khoan, minh khong the xac dinh ly do that bai."
                            : "I need you to sign in before I can inspect your latest payment transaction. Without account data, I cannot confirm the failure reason.",
                    List.of(
                            suggestion(vietnamese, "Show my upcoming tickets", "Cho xem ve sap toi"),
                            suggestion(vietnamese, "Where do I manage my subscription?", "Quan ly goi dang ky o dau?")
                    ),
                    List.of(),
                    true,
                    "/login",
                    label(vietnamese, "Sign In", "Dang nhap"),
                    List.of("Private payment lookup requires authentication.")
            );
        }

        Optional<AiAccountAdapterService.PaymentFailureSummary> failure = aiAccountAdapterService.getLatestPaymentFailure();
        if (failure.isEmpty()) {
            return new AnswerBundle(
                    "payment-transactions",
                    vietnamese
                            ? "Minh khong thay giao dich that bai gan day trong tai khoan cua ban. Neu ban vua thanh toan, hay kiem tra trang payment hoac sandbox payment page."
                            : "I cannot find a recent failed transaction in your account. If you just tried to pay, check the payment page or the sandbox payment page.",
                    List.of(
                            suggestion(vietnamese, "Show my upcoming tickets", "Cho xem ve sap toi"),
                            suggestion(vietnamese, "Help me book tickets", "Huong dan dat ve")
                    ),
                    List.of(),
                    false,
                    "/payment",
                    label(vietnamese, "Open Payment", "Mo thanh toan"),
                    List.of("No failed transaction was found for the current user.")
            );
        }

        AiAccountAdapterService.PaymentFailureSummary latest = failure.get();
        AiAssistantCard card = new AiAssistantCard();
        card.setType("payment");
        card.setTitle(vietnamese ? "Thanh toan that bai" : "Payment failed");
        card.setSubtitle(safe(latest.module()) + " | " + safe(latest.transactionCode()));
        card.setDescription(vietnamese
                ? "Trang thai gan nhat la " + safe(latest.status()) + ". Minh khong suy doan them ngoai du lieu giao dich hien co."
                : "The latest recorded status is " + safe(latest.status()) + ". I am not inferring more than the transaction data shows.");
        card.setDetails(List.of(
                label(vietnamese, "Amount", "So tien") + ": " + formatAmount(latest.amount()),
                label(vietnamese, "Created", "Tao luc") + ": " + formatDateTime(latest.createdAt())
        ));
        card.setBadges(List.of(safe(latest.status()), safe(latest.module())));
        card.setActionPath(latest.actionPath());
        card.setActionLabel(label(vietnamese, "Review Payment", "Xem thanh toan"));

        return new AnswerBundle(
                "payment-transactions",
                vietnamese
                        ? "Giao dich that bai gan nhat cua ban thuoc module " + safe(latest.module()) + " va dang o trang thai " + safe(latest.status()) + ". Hay mo trang lien quan de thu lai hoac kiem tra chi tiet."
                        : "Your latest failed transaction is in the " + safe(latest.module()) + " module with status " + safe(latest.status()) + ". Open the related page to retry or inspect the details.",
                List.of(
                        suggestion(vietnamese, "Help me book tickets", "Huong dan dat ve"),
                        suggestion(vietnamese, "Where do I manage my subscription?", "Quan ly goi dang ky o dau?")
                ),
                List.of(card),
                false,
                latest.actionPath(),
                label(vietnamese, "Review Payment", "Xem thanh toan"),
                List.of(
                        "Module: " + safe(latest.module()),
                        "Status: " + safe(latest.status()),
                        "Amount: " + formatAmount(latest.amount()),
                        "Created at: " + formatDateTime(latest.createdAt())
                )
        );
    }

    private AnswerBundle buildBookingHelp(AiAssistantRequest request, boolean vietnamese) {
        AiAssistantContext context = request.getContext() == null ? new AiAssistantContext() : request.getContext();
        String handoffPath = resolveBookingPath(context);
        String handoffLabel = switch (handoffPath) {
            case "/cinema/seats" -> label(vietnamese, "Open Seats", "Mo so do ghe");
            case "/cinema/checkout" -> label(vietnamese, "Open Checkout", "Mo checkout");
            default -> label(vietnamese, "Start Booking", "Bat dau dat ve");
        };

        AiAssistantCard card = new AiAssistantCard();
        card.setType("help");
        card.setTitle(vietnamese ? "Huong dan dat ve" : "Booking flow");
        card.setSubtitle(vietnamese ? "Quy trinh ngan gon" : "Clean step flow");
        card.setDescription(vietnamese
                ? "Day la luong dat ve dung voi cau truc hien tai cua JDWoMoviex Cinema."
                : "This is the supported booking flow in the current JDWoMoviex Cinema structure.");
        card.setDetails(List.of(
                label(vietnamese, "1. Choose movie", "1. Chon phim"),
                label(vietnamese, "2. Choose showtime", "2. Chon suat chieu"),
                label(vietnamese, "3. Choose seats", "3. Chon ghe"),
                label(vietnamese, "4. Review checkout", "4. Xem lai"),
                label(vietnamese, "5. Payment", "5. Thanh toan"),
                label(vietnamese, "6. Ticket", "6. Nhan ve")
        ));
        card.setActionPath(handoffPath);
        card.setActionLabel(handoffLabel);

        List<String> facts = new ArrayList<>();
        facts.add("Current route: " + safe(context.getRoute()));
        facts.add("Current page: " + safe(context.getPage()));
        if (context.getMovieId() != null && !context.getMovieId().isBlank()) {
            facts.add("Selected movieId: " + context.getMovieId());
        }
        if (context.getShowtimeId() != null && !context.getShowtimeId().isBlank()) {
            facts.add("Selected showtimeId: " + context.getShowtimeId());
        }
        if (context.getSeatLabels() != null && !context.getSeatLabels().isEmpty()) {
            facts.add("Selected seats: " + String.join(", ", context.getSeatLabels()));
        }

        return new AnswerBundle(
                "booking-flow",
                vietnamese
                        ? "Luong dat ve la: phim, suat chieu, ghe, review, payment, ticket. Minh co the dua ban den buoc tiep theo phu hop voi trang hien tai."
                        : "The booking flow is: movie, showtime, seats, review, payment, ticket. I can send you to the next valid step based on your current context.",
                List.of(
                        suggestion(vietnamese, "What movies are showing tonight?", "Toi nay co phim nao dang chieu?"),
                        suggestion(vietnamese, "Which seats are best for 2 people?", "Ghe nao tot cho 2 nguoi?")
                ),
                List.of(card),
                false,
                handoffPath,
                handoffLabel,
                facts
        );
    }

    private AnswerBundle buildSubscriptionSupport(boolean vietnamese) {
        boolean authenticated = aiAccountAdapterService.getCurrentUserOptional().isPresent();
        return new AnswerBundle(
                "subscription-support",
                vietnamese
                        ? "Ban co the quan ly goi dang ky trong trang Subscription. Neu chua co goi, hay mo Plans de chon Basic, Standard hoac Premium."
                        : "You can manage your subscription on the Subscription page. If you do not have a plan yet, open Plans to choose Basic, Standard, or Premium.",
                List.of(
                        suggestion(vietnamese, "What is included in Premium?", "Premium gom nhung gi?"),
                        suggestion(vietnamese, "Why did my payment fail?", "Vi sao thanh toan cua minh that bai?")
                ),
                List.of(),
                false,
                authenticated ? "/subscription" : "/plans",
                authenticated
                        ? label(vietnamese, "Open Subscription", "Mo goi dang ky")
                        : label(vietnamese, "View Plans", "Xem goi"),
                List.of(
                        "Subscription route: /subscription",
                        "Plans route: /plans"
                )
        );
    }

    private AnswerBundle buildPlatformHelp(AiAssistantRequest request, boolean vietnamese) {
        AiAssistantContext context = request.getContext() == null ? new AiAssistantContext() : request.getContext();
        return new AnswerBundle(
                "platform-help",
                vietnamese
                        ? "Minh ho tro ve movie discovery, lich chieu, ghe, dat ve, ve, subscription va payment trong Moviex + JDWoMoviex. Neu ban noi ro muc tieu, minh se dua den dung trang."
                        : "I can help with movie discovery, showtimes, seats, bookings, tickets, subscriptions, and payments in Moviex + JDWoMoviex. If you tell me the goal, I will point you to the correct page.",
                List.of(
                        suggestion(vietnamese, "Recommend me a thriller movie", "Goi y phim thriller cho minh"),
                        suggestion(vietnamese, "Help me book tickets", "Huong dan dat ve"),
                        suggestion(vietnamese, "Show my upcoming tickets", "Cho xem ve sap toi")
                ),
                List.of(),
                false,
                resolvePlatformPath(context),
                label(vietnamese, "Open Relevant Page", "Mo trang phu hop"),
                List.of(
                        "Current route: " + safe(context.getRoute()),
                        "Current page: " + safe(context.getPage())
                )
        );
    }

    private AnswerBundle buildOffScope(boolean vietnamese) {
        return new AnswerBundle(
                "assistant-scope",
                vietnamese
                        ? "Minh chi ho tro trong pham vi Moviex + JDWoMoviex Cinema: phim, lich chieu, ghe, dat ve, ve, subscription, payment va ho tro nen tang."
                        : "I can only help within Moviex + JDWoMoviex Cinema: movies, showtimes, seats, bookings, tickets, subscriptions, payments, and platform support.",
                List.of(
                        suggestion(vietnamese, "Recommend me a thriller movie", "Goi y phim thriller cho minh"),
                        suggestion(vietnamese, "What movies are showing tonight?", "Toi nay co phim nao dang chieu?"),
                        suggestion(vietnamese, "Help me book tickets", "Huong dan dat ve")
                ),
                List.of(),
                false,
                "/browse",
                label(vietnamese, "Open Moviex", "Mo Moviex"),
                List.of("Request was outside the supported domain scope.")
        );
    }

    private AnswerBundle buildAuthRequiredBundle(boolean vietnamese) {
        return new AnswerBundle(
                "private-account",
                vietnamese
                        ? "Yeu cau nay can dang nhap de doc du lieu rieng cua ban. Hay dang nhap roi hoi lai, minh se dua tren ticket, booking, payment hoac subscription that."
                        : "This request needs sign-in so I can read your private account data. Sign in and ask again, then I will use your real tickets, bookings, payments, or subscription data.",
                List.of(
                        suggestion(vietnamese, "What movies are showing tonight?", "Toi nay co phim nao dang chieu?"),
                        suggestion(vietnamese, "What is included in Premium?", "Premium gom nhung gi?")
                ),
                List.of(),
                true,
                "/login",
                label(vietnamese, "Sign In", "Dang nhap"),
                List.of("Authentication is required for private account data.")
        );
    }

    private AnswerBundle buildSafeFallback(boolean vietnamese) {
        return new AnswerBundle(
                "assistant-fallback",
                vietnamese
                        ? "Minh chua tai duoc du lieu can thiet luc nay. Ban co the thu lai hoac mo trang lien quan truc tiep."
                        : "I could not load the required data right now. Try again or open the relevant page directly.",
                List.of(
                        suggestion(vietnamese, "What movies are showing tonight?", "Toi nay co phim nao dang chieu?"),
                        suggestion(vietnamese, "Help me book tickets", "Huong dan dat ve")
                ),
                List.of(),
                false,
                "/browse",
                label(vietnamese, "Open Moviex", "Mo Moviex"),
                List.of("Safe fallback was used because assistant data could not be loaded.")
        );
    }

    private AiAssistantResponse toResponse(AiIntent intent, String locale, String userMessage, AnswerBundle bundle) {
        AiAssistantResponse response = new AiAssistantResponse();
        response.setIntent(intent.name());
        response.setLocale(locale);
        response.setSource(bundle.source());
        response.setRequiresAuth(bundle.requiresAuth());
        response.setHandoffPath(bundle.handoffPath());
        response.setHandoffLabel(bundle.handoffLabel());
        response.setSuggestions(bundle.suggestions());
        response.setCards(bundle.cards());
        response.setAnswer(aiProviderService.composeAnswer(intent, locale, userMessage, bundle.facts(), bundle.answer())
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .orElse(bundle.answer()));
        return response;
    }

    private AiAssistantCard buildMovieCard(MovieDto movie, boolean vietnamese) {
        AiAssistantCard card = new AiAssistantCard();
        card.setType("movie");
        card.setTitle(safe(movie.getTitle()));
        card.setSubtitle(joinParts(safe(movie.getGenre()), movie.getYear() > 0 ? String.valueOf(movie.getYear()) : ""));
        card.setDescription(trimDescription(movie.getDescription()));
        card.setBadges(List.of(
                safePlan(movie.getRequiredSubscription()),
                label(vietnamese, "Streaming", "Streaming")
        ));
        card.setDetails(List.of(
                label(vietnamese, "Genre", "The loai") + ": " + safe(movie.getGenre()),
                label(vietnamese, "Plan", "Goi") + ": " + safePlan(movie.getRequiredSubscription())
        ));
        card.setActionPath("/browse?play=" + movie.getId());
        card.setActionLabel(label(vietnamese, "Open Movie", "Mo phim"));
        return card;
    }

    private AiAssistantCard buildShowtimeCard(ShowtimeViewResponse showtime, boolean vietnamese) {
        AiAssistantCard card = new AiAssistantCard();
        card.setType("showtime");
        card.setTitle(safe(showtime.getMovieTitle()));
        card.setSubtitle(joinParts(formatDate(showtime.getShowDate()), formatTime(showtime.getStartTime())));
        card.setDescription(safe(showtime.getCinemaName()) + " | " + safe(showtime.getAuditoriumName()));
        card.setBadges(List.of(safe(showtime.getCinemaCity()), formatAmount(showtime.getBasePrice())));
        card.setDetails(List.of(
                label(vietnamese, "Cinema", "Rap") + ": " + safe(showtime.getCinemaName()),
                label(vietnamese, "Auditorium", "Phong chieu") + ": " + safe(showtime.getAuditoriumName()),
                label(vietnamese, "Time", "Gio") + ": " + formatTime(showtime.getStartTime())
        ));
        card.setActionPath("/cinema/movie/" + showtime.getMovieId() + "/showtimes");
        card.setActionLabel(label(vietnamese, "Open Showtimes", "Mo suat chieu"));
        return card;
    }

    private AiAssistantCard buildSeatPairCard(AiCinemaAdapterService.SeatPairRecommendation pair, boolean vietnamese) {
        SeatAvailabilityResponse left = pair.left();
        SeatAvailabilityResponse right = pair.right();
        AiAssistantCard card = new AiAssistantCard();
        card.setType("seats");
        card.setTitle(aiCinemaAdapterService.buildSeatLabel(left) + " + " + aiCinemaAdapterService.buildSeatLabel(right));
        card.setSubtitle(vietnamese ? "Cap ghe de xuat" : "Recommended pair");
        card.setDescription(vietnamese
                ? "Cap ghe lien nhau, uu tien vi tri can doi trong khan phong."
                : "Adjacent pair with preference for balanced auditorium positioning.");
        card.setBadges(List.of(
                aiCinemaAdapterService.describeSeatType(left.getType(), vietnamese),
                label(vietnamese, "2 people", "2 nguoi")
        ));
        card.setDetails(List.of(
                label(vietnamese, "Left", "Trai") + ": " + aiCinemaAdapterService.buildSeatLabel(left),
                label(vietnamese, "Right", "Phai") + ": " + aiCinemaAdapterService.buildSeatLabel(right)
        ));
        card.setActionPath("/cinema/seats");
        card.setActionLabel(label(vietnamese, "Open Seats", "Mo so do ghe"));
        return card;
    }

    private AiAssistantCard buildTicketCard(CinemaTicketViewResponse ticket, boolean vietnamese) {
        AiAssistantCard card = new AiAssistantCard();
        card.setType("ticket");
        card.setTitle(safe(ticket.getMovieTitle()));
        card.setSubtitle(joinParts(formatDate(ticket.getShowDate()), formatTime(ticket.getStartTime())));
        card.setDescription(safe(ticket.getCinemaName()) + " | " + safe(ticket.getAuditoriumName()));
        card.setBadges(List.of(safe(ticket.getBookingCode()), safe(ticket.getPaymentStatus())));
        card.setDetails(List.of(
                label(vietnamese, "Seats", "Ghe") + ": " + String.join(", ", ticket.getSeats()),
                label(vietnamese, "Total", "Tong tien") + ": " + formatAmount(ticket.getTotalAmount())
        ));
        card.setActionPath("/cinema/tickets/" + ticket.getBookingId());
        card.setActionLabel(label(vietnamese, "Open Ticket", "Mo ve"));
        return card;
    }

    private String resolveBookingPath(AiAssistantContext context) {
        if (context == null) {
            return "/cinema/now-showing";
        }
        if (context.getSeatLabels() != null && !context.getSeatLabels().isEmpty()) {
            return "/cinema/checkout";
        }
        if (context.getShowtimeId() != null && !context.getShowtimeId().isBlank()) {
            return "/cinema/seats";
        }
        if (context.getMovieId() != null && !context.getMovieId().isBlank()) {
            return "/cinema/movie/" + context.getMovieId() + "/showtimes";
        }
        return "/cinema/now-showing";
    }

    private String resolvePlatformPath(AiAssistantContext context) {
        String route = context == null ? "" : safe(context.getRoute());
        if (route.startsWith("/cinema")) {
            return "/cinema";
        }
        if (route.startsWith("/subscription") || route.startsWith("/plans")) {
            return "/subscription";
        }
        return "/browse";
    }

    private String resolveLocale(AiAssistantRequest request) {
        String rawLocale = request == null ? null : request.getLocale();
        if (rawLocale == null || rawLocale.isBlank()) {
            return detectVietnameseFromText(request == null ? null : request.getMessage()) ? "vi" : "en";
        }
        String normalized = rawLocale.trim().toLowerCase(Locale.ROOT);
        return normalized.startsWith("vi") ? "vi" : "en";
    }

    private boolean isVietnamese(String locale) {
        return locale != null && locale.toLowerCase(Locale.ROOT).startsWith("vi");
    }

    private boolean detectVietnameseFromText(String message) {
        String normalized = normalize(message);
        return normalized.contains("phim")
                || normalized.contains("suat chieu")
                || normalized.contains("ghe")
                || normalized.contains("ve")
                || normalized.contains("dang ky")
                || normalized.contains("thanh toan");
    }

    private String normalize(String value) {
        String lower = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return Normalizer.normalize(lower, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String safe(Object value) {
        return value == null ? "-" : String.valueOf(value);
    }

    private String safePlan(SubscriptionPlan plan) {
        return plan == null ? "BASIC" : plan.name();
    }

    private String formatDate(LocalDate date) {
        return date == null ? "-" : DATE_FORMAT.format(date);
    }

    private String formatTime(java.time.LocalTime time) {
        return time == null ? "-" : TIME_FORMAT.format(time);
    }

    private String formatDateTime(java.time.LocalDateTime dateTime) {
        if (dateTime == null) {
            return "-";
        }
        return DATE_FORMAT.format(dateTime.toLocalDate()) + " " + TIME_FORMAT.format(dateTime.toLocalTime());
    }

    private String formatAmount(BigDecimal amount) {
        BigDecimal safeAmount = amount == null ? BigDecimal.ZERO : amount;
        return String.format(Locale.US, "%,.0f VND", safeAmount);
    }

    private String suggestion(boolean vietnamese, String english, String vietnameseText) {
        return vietnamese ? vietnameseText : english;
    }

    private String label(boolean vietnamese, String english, String vietnameseText) {
        return vietnamese ? vietnameseText : english;
    }

    private String trimDescription(String description) {
        if (description == null || description.isBlank()) {
            return "-";
        }
        String trimmed = description.trim();
        return trimmed.length() <= 160 ? trimmed : trimmed.substring(0, 157).trim() + "...";
    }

    private String joinParts(String left, String right) {
        List<String> parts = new ArrayList<>();
        if (left != null && !left.isBlank() && !"-".equals(left)) {
            parts.add(left);
        }
        if (right != null && !right.isBlank() && !"-".equals(right)) {
            parts.add(right);
        }
        return parts.isEmpty() ? "-" : String.join(" | ", parts);
    }

    private record AnswerBundle(
            String source,
            String answer,
            List<String> suggestions,
            List<AiAssistantCard> cards,
            boolean requiresAuth,
            String handoffPath,
            String handoffLabel,
            List<String> facts
    ) {
    }
}
