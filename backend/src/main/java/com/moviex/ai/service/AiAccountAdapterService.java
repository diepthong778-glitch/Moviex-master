package com.moviex.ai.service;

import com.moviex.cinema.dto.CinemaTicketViewResponse;
import com.moviex.cinema.model.Booking;
import com.moviex.cinema.model.CinemaPaymentStatus;
import com.moviex.cinema.repository.BookingRepository;
import com.moviex.cinema.repository.CinemaPaymentTransactionRepository;
import com.moviex.dto.SubscriptionResponse;
import com.moviex.model.PaymentStatus;
import com.moviex.model.SubscriptionPlan;
import com.moviex.model.SubscriptionStatus;
import com.moviex.model.User;
import com.moviex.repository.PaymentTransactionRepository;
import com.moviex.service.CurrentUserService;
import com.moviex.service.SubscriptionService;
import com.moviex.cinema.service.TicketService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class AiAccountAdapterService {
    private final CurrentUserService currentUserService;
    private final SubscriptionService subscriptionService;
    private final TicketService ticketService;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final CinemaPaymentTransactionRepository cinemaPaymentTransactionRepository;
    private final BookingRepository bookingRepository;

    public AiAccountAdapterService(CurrentUserService currentUserService,
                                   SubscriptionService subscriptionService,
                                   TicketService ticketService,
                                   PaymentTransactionRepository paymentTransactionRepository,
                                   CinemaPaymentTransactionRepository cinemaPaymentTransactionRepository,
                                   BookingRepository bookingRepository) {
        this.currentUserService = currentUserService;
        this.subscriptionService = subscriptionService;
        this.ticketService = ticketService;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.cinemaPaymentTransactionRepository = cinemaPaymentTransactionRepository;
        this.bookingRepository = bookingRepository;
    }

    public Optional<User> getCurrentUserOptional() {
        try {
            return Optional.of(currentUserService.getCurrentUser());
        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode().value() == HttpStatus.UNAUTHORIZED.value()) {
                return Optional.empty();
            }
            throw exception;
        }
    }

    public SubscriptionResponse getCurrentSubscription() {
        return subscriptionService.getCurrentUserSubscription();
    }

    public List<CinemaTicketViewResponse> listUpcomingTickets() {
        return ticketService.listUpcomingTicketsForCurrentUser();
    }

    public Optional<PaymentFailureSummary> getLatestPaymentFailure() {
        User currentUser = currentUserService.getCurrentUser();
        List<PaymentFailureSummary> candidates = new ArrayList<>();

        paymentTransactionRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId()).stream()
                .filter(transaction -> transaction.getStatus() == PaymentStatus.FAILED)
                .findFirst()
                .ifPresent(transaction -> candidates.add(new PaymentFailureSummary(
                        "streaming",
                        transaction.getTxnCode(),
                        transaction.getStatus().name(),
                        transaction.getAmount(),
                        transaction.getCreatedAt(),
                        transaction.getMovieId() != null && !transaction.getMovieId().isBlank()
                                ? "/payment?movieId=" + transaction.getMovieId() + "&txnCode=" + transaction.getTxnCode()
                                : "/plans"
                )));

        List<String> bookingIds = bookingRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId()).stream()
                .map(Booking::getId)
                .toList();
        if (!bookingIds.isEmpty()) {
            cinemaPaymentTransactionRepository.findByBookingIdInOrderByCreatedAtDesc(bookingIds).stream()
                    .filter(transaction -> transaction.getStatus() == CinemaPaymentStatus.FAILED
                            || transaction.getStatus() == CinemaPaymentStatus.CANCELLED)
                    .findFirst()
                    .ifPresent(transaction -> candidates.add(new PaymentFailureSummary(
                            "cinema",
                            transaction.getTxnCode(),
                            transaction.getStatus().name(),
                            transaction.getAmount(),
                            transaction.getCreatedAt(),
                            "/cinema/tickets"
                    )));
        }

        return candidates.stream()
                .max(Comparator.comparing(PaymentFailureSummary::createdAt, Comparator.nullsLast(LocalDateTime::compareTo)));
    }

    public PlanDetails getPlanDetails(SubscriptionPlan plan) {
        SubscriptionPlan safePlan = plan == null ? SubscriptionPlan.BASIC : plan;
        return switch (safePlan) {
            case BASIC -> new PlanDetails(
                    SubscriptionPlan.BASIC,
                    new BigDecimal("10000"),
                    List.of("Basic catalog", "1 device", "HD quality"),
                    List.of("Kho phim co ban", "1 thiet bi", "Chat luong HD")
            );
            case STANDARD -> new PlanDetails(
                    SubscriptionPlan.STANDARD,
                    new BigDecimal("49000"),
                    List.of("Basic + Standard catalog", "2 devices", "Priority support"),
                    List.of("Kho BASIC + STANDARD", "2 thiet bi", "Ho tro uu tien")
            );
            case PREMIUM -> new PlanDetails(
                    SubscriptionPlan.PREMIUM,
                    new BigDecimal("99000"),
                    List.of("Full content access", "4 devices", "Maximum quality"),
                    List.of("Toan bo noi dung", "4 thiet bi", "Chat luong toi da")
            );
        };
    }

    public boolean isSubscriptionActive(SubscriptionResponse subscriptionResponse) {
        return subscriptionResponse != null && subscriptionResponse.getStatus() == SubscriptionStatus.ACTIVE;
    }

    public record PaymentFailureSummary(
            String module,
            String transactionCode,
            String status,
            BigDecimal amount,
            LocalDateTime createdAt,
            String actionPath
    ) {
    }

    public record PlanDetails(
            SubscriptionPlan plan,
            BigDecimal price,
            List<String> featuresEn,
            List<String> featuresVi
    ) {
    }
}
