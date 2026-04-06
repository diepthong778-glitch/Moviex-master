package com.moviex.service;

import com.moviex.dto.SubscribeRequest;
import com.moviex.dto.SubscriptionResponse;
import com.moviex.model.Subscription;
import com.moviex.model.SubscriptionPlan;
import com.moviex.model.SubscriptionStatus;
import com.moviex.model.User;
import com.moviex.repository.SubscriptionRepository;
import com.moviex.repository.UserRepository;
import com.moviex.security.UserDetailsImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SubscriptionServiceImpl implements SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final MovieAccessGuard movieAccessGuard;
    private final RealtimeActivityService realtimeActivityService;
    private static final Logger logger = LoggerFactory.getLogger(SubscriptionServiceImpl.class);

    public SubscriptionServiceImpl(SubscriptionRepository subscriptionRepository,
                                   UserRepository userRepository,
                                   MovieAccessGuard movieAccessGuard,
                                   RealtimeActivityService realtimeActivityService) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.movieAccessGuard = movieAccessGuard;
        this.realtimeActivityService = realtimeActivityService;
    }

    @Override
    public Map<String, Object> getCurrentSubscription() {
        SubscriptionResponse response = getCurrentUserSubscription();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", response.getId());
        payload.put("userId", response.getUserId());
        payload.put("type", response.getType() != null ? response.getType().name() : "NONE");
        payload.put("planType", response.getPlanType() != null ? response.getPlanType().name() : "NONE");
        payload.put("startDate", response.getStartDate());
        payload.put("endDate", response.getEndDate());
        payload.put("remainingDays", response.getRemainingDays());
        payload.put("status", response.getStatus() != null ? response.getStatus().name() : "EXPIRED");
        payload.put("active", response.isActive());
        payload.put("createdAt", response.getCreatedAt());
        return payload;
    }

    @Override
    public Map<String, Object> subscribe(SubscribeRequest request) {
        if (request.getType() == null) {
            throw new IllegalArgumentException("Subscription type is required");
        }
        SubscriptionResponse response = activateSubscription(getCurrentUserId(), request.getType());
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", response.getId());
        payload.put("userId", response.getUserId());
        payload.put("type", response.getPlanType() != null ? response.getPlanType().name() : "NONE");
        payload.put("planType", response.getPlanType() != null ? response.getPlanType().name() : "NONE");
        payload.put("startDate", response.getStartDate());
        payload.put("endDate", response.getEndDate());
        payload.put("remainingDays", response.getRemainingDays());
        payload.put("status", response.getStatus() != null ? response.getStatus().name() : "EXPIRED");
        payload.put("active", response.isActive());
        payload.put("createdAt", response.getCreatedAt());
        return payload;
    }

    @Override
    public boolean canAccessMovie(String userId, SubscriptionPlan requiredPlan) {
        if (requiredPlan == null || requiredPlan == SubscriptionPlan.BASIC) {
            return true;
        }

        SubscriptionPlan userPlan = subscriptionRepository.findByUserId(userId)
                .map(this::resolveAndPersistIfNeeded)
                .filter(item -> item.getStatus() == SubscriptionStatus.ACTIVE)
                .map(Subscription::getPlanType)
                .orElse(SubscriptionPlan.BASIC);

        return movieAccessGuard.canAccess(userPlan, requiredPlan);
    }

    @Override
    public SubscriptionResponse createSubscription(String userId, SubscriptionPlan plan) {
        if (plan == null) {
            throw new IllegalArgumentException("plan is required");
        }

        Subscription subscription = subscriptionRepository.findByUserId(userId).orElseGet(Subscription::new);
        subscription.setUserId(userId);
        subscription.setPlanType(plan);
        subscription.setStartDate(null);
        subscription.setEndDate(null);
        subscription.setRemainingDays(0L);
        subscription.setStatus(SubscriptionStatus.PENDING);
        if (subscription.getCreatedAt() == null) {
            subscription.setCreatedAt(LocalDateTime.now());
        }

        return toResponse(subscriptionRepository.save(subscription));
    }

    @Override
    public SubscriptionResponse activateSubscription(String userId, SubscriptionPlan plan) {
        Subscription subscription = subscriptionRepository.findByUserId(userId).orElseGet(Subscription::new);
        SubscriptionPlan targetPlan = plan != null ? plan : subscription.getPlanType();
        if (targetPlan == null) {
            throw new IllegalArgumentException("plan is required");
        }

        LocalDate startDate = LocalDate.now();
        int duration = getDurationDays(targetPlan);
        LocalDate endDate = startDate.plusDays(duration);

        subscription.setUserId(userId);
        subscription.setPlanType(targetPlan);
        subscription.setStartDate(startDate);
        subscription.setEndDate(endDate);
        subscription.setRemainingDays((long) duration);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        if (subscription.getCreatedAt() == null) {
            subscription.setCreatedAt(LocalDateTime.now());
        }

        Subscription saved = subscriptionRepository.save(subscription);
        userRepository.findById(userId).ifPresent(user -> {
            user.setSubscriptionPlan(targetPlan);
            userRepository.save(user);
            realtimeActivityService.subscriptionActivated(user, targetPlan);
        });

        return toResponse(saved);
    }

    @Override
    public SubscriptionResponse activateSubscription() {
        String userId = getCurrentUserId();
        Subscription subscription = subscriptionRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("No pending subscription selected"));
        return activateSubscription(userId, subscription.getPlanType());
    }

    @Override
    @Scheduled(cron = "0 */30 * * * *")
    public void checkExpiration() {
        LocalDate today = LocalDate.now();
        List<Subscription> subscriptions = subscriptionRepository.findByStatus(SubscriptionStatus.ACTIVE);
        subscriptions.addAll(subscriptionRepository.findByStatus(SubscriptionStatus.PENDING));
        for (Subscription subscription : subscriptions) {
            SubscriptionStatus nextStatus = subscription.getStatus();
            Long remaining = subscription.getRemainingDays() != null ? subscription.getRemainingDays() : 0L;

            if (subscription.getStatus() == SubscriptionStatus.ACTIVE && subscription.getEndDate() != null) {
                long calculated = Math.max(0, ChronoUnit.DAYS.between(today, subscription.getEndDate()));
                remaining = calculated;
                nextStatus = calculated > 0 ? SubscriptionStatus.ACTIVE : SubscriptionStatus.EXPIRED;
            } else if (subscription.getStatus() == SubscriptionStatus.PENDING) {
                remaining = 0L;
            }

            boolean changed = !remaining.equals(subscription.getRemainingDays()) || nextStatus != subscription.getStatus();
            if (changed) {
                subscription.setRemainingDays(remaining);
                subscription.setStatus(nextStatus);
                subscriptionRepository.save(subscription);
            }
        }
    }

    @Override
    public Optional<SubscriptionResponse> getUserSubscription(String userId) {
        return subscriptionRepository.findByUserId(userId)
                .map(this::resolveAndPersistIfNeeded)
                .map(this::toResponse);
    }

    @Override
    public SubscriptionResponse getUserSubscription() {
        return getCurrentUserSubscription();
    }

    @Override
    public SubscriptionResponse getCurrentUserSubscription() {
        String userId = getCurrentUserId();
        return getUserSubscription(userId).orElseGet(() -> {
            SubscriptionResponse response = new SubscriptionResponse();
            response.setUserId(userId);
            response.setPlanType(null);
            response.setStatus(SubscriptionStatus.EXPIRED);
            response.setRemainingDays(0L);
            response.setActive(false);
            return response;
        });
    }

    @Override
    public List<SubscriptionResponse> getAllSubscriptions() {
        return subscriptionRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::resolveAndPersistIfNeeded)
                .map(this::toResponse)
                .toList();
    }

    @Override
    public SubscriptionResponse grantAccess(String userId, SubscriptionPlan plan, Integer durationDays) {
        if (plan == null) {
            throw new IllegalArgumentException("planType is required");
        }
        int duration = durationDays != null && durationDays > 0 ? durationDays : getDurationDays(plan);
        Subscription subscription = subscriptionRepository.findByUserId(userId).orElseGet(Subscription::new);

        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusDays(duration);

        subscription.setUserId(userId);
        subscription.setPlanType(plan);
        subscription.setStartDate(startDate);
        subscription.setEndDate(endDate);
        subscription.setRemainingDays((long) duration);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        if (subscription.getCreatedAt() == null) {
            subscription.setCreatedAt(LocalDateTime.now());
        }

        Subscription saved = subscriptionRepository.save(subscription);
        userRepository.findById(userId).ifPresent(user -> {
            user.setSubscriptionPlan(plan);
            userRepository.save(user);
            realtimeActivityService.subscriptionActivated(user, plan);
        });
        return toResponse(saved);
    }

    @Override
    public SubscriptionStatus resolveStatus(SubscriptionResponse response) {
        return response != null ? response.getStatus() : SubscriptionStatus.EXPIRED;
    }

    private SubscriptionResponse toResponse(Subscription subscription) {
        SubscriptionResponse response = new SubscriptionResponse();
        response.setId(subscription.getId());
        response.setUserId(subscription.getUserId());
        response.setPlanType(subscription.getPlanType());
        response.setStartDate(subscription.getStartDate());
        response.setEndDate(subscription.getEndDate());
        response.setRemainingDays(subscription.getRemainingDays() != null ? subscription.getRemainingDays() : 0L);
        response.setStatus(subscription.getStatus());
        response.setCreatedAt(subscription.getCreatedAt());
        response.setActive(subscription.getStatus() == SubscriptionStatus.ACTIVE);
        return response;
    }

    private Subscription resolveAndPersistIfNeeded(Subscription subscription) {
        if (subscription == null) return null;

        LocalDate today = LocalDate.now();
        SubscriptionStatus nextStatus = subscription.getStatus();
        Long nextRemaining = subscription.getRemainingDays() != null ? subscription.getRemainingDays() : 0L;

        if (subscription.getStatus() == SubscriptionStatus.ACTIVE && subscription.getEndDate() != null) {
            long calculated = Math.max(0, ChronoUnit.DAYS.between(today, subscription.getEndDate()));
            nextRemaining = calculated;
            nextStatus = calculated > 0 ? SubscriptionStatus.ACTIVE : SubscriptionStatus.EXPIRED;
        } else if (subscription.getStatus() == SubscriptionStatus.PENDING) {
            nextRemaining = 0L;
        }

        boolean changed = !nextRemaining.equals(subscription.getRemainingDays()) || nextStatus != subscription.getStatus();
        if (!changed) return subscription;

        subscription.setRemainingDays(nextRemaining);
        subscription.setStatus(nextStatus);
        return subscriptionRepository.save(subscription);
    }

    private int getDurationDays(SubscriptionPlan plan) {
        return switch (plan) {
            case BASIC -> 30;
            case STANDARD -> 30;
            case PREMIUM -> 30;
        };
    }

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl userDetails) {
            String email = userDetails.getUsername();
            return userRepository.findByEmail(email)
                    .map(User::getId)
                    .orElseThrow(() -> {
                        logger.error("User not found for email: {}", email);
                        return new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
                    });
        }

        logger.warn("No authenticated user in security context when resolving subscription");
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
    }
}
