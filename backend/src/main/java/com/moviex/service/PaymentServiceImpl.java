package com.moviex.service;

import com.moviex.dto.PaymentConfirmRequest;
import com.moviex.dto.PaymentCreateRequest;
import com.moviex.dto.PaymentEntitlementsResponse;
import com.moviex.dto.PaymentTransactionResponse;
import com.moviex.model.Movie;
import com.moviex.model.PaymentMethod;
import com.moviex.model.PaymentStatus;
import com.moviex.model.PaymentTargetType;
import com.moviex.model.PaymentTransaction;
import com.moviex.model.SubscriptionPlan;
import com.moviex.model.SubscriptionStatus;
import com.moviex.model.User;
import com.moviex.repository.MovieRepository;
import com.moviex.repository.PaymentTransactionRepository;
import com.moviex.repository.UserRepository;
import com.moviex.service.payment.PaymentProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Service
public class PaymentServiceImpl implements PaymentService {
    private static final DateTimeFormatter TXN_DAY_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final Logger logger = LoggerFactory.getLogger(PaymentServiceImpl.class);

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final CurrentUserService currentUserService;
    private final SubscriptionService subscriptionService;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;
    private final List<PaymentProvider> paymentProviders;

    public PaymentServiceImpl(PaymentTransactionRepository paymentTransactionRepository,
                              CurrentUserService currentUserService,
                              SubscriptionService subscriptionService,
                              MovieRepository movieRepository,
                              UserRepository userRepository,
                              List<PaymentProvider> paymentProviders) {
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.currentUserService = currentUserService;
        this.subscriptionService = subscriptionService;
        this.movieRepository = movieRepository;
        this.userRepository = userRepository;
        this.paymentProviders = paymentProviders;
    }

    @Override
    public PaymentTransactionResponse createPayment(PaymentCreateRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        TargetDescriptor target = resolveTarget(request);

        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setTxnCode(generateTxnCode());
        transaction.setUserId(currentUser.getId());
        transaction.setAmount(resolveAmount(request, target));
        transaction.setCurrency(resolveCurrency(request));
        transaction.setPaymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : PaymentMethod.QR);
        transaction.setPaymentContent(buildPaymentContent(target, transaction.getTxnCode()));
        transaction.setPaymentNote("Thanh toan ao MovieX Sandbox. Khong phat sinh tien that.");
        transaction.setTargetType(target.targetType());
        transaction.setMovieId(target.movieId());
        transaction.setPackageId(target.packageId());
        transaction.setPlanType(target.planType());
        transaction.setRedirectPath(resolveRedirectPath(request, target));
        transaction.setCreatedAt(LocalDateTime.now());
        transaction.setUpdatedAt(LocalDateTime.now());

        PaymentProvider provider = paymentProviders.stream()
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No payment provider configured"));

        PaymentTransaction prepared = provider.initialize(transaction);
        PaymentTransaction saved = paymentTransactionRepository.save(prepared);
        return PaymentTransactionResponse.from(saved);
    }

    @Override
    public PaymentTransactionResponse getTransactionByTxnCode(String txnCode) {
        return PaymentTransactionResponse.from(findByTxnCode(txnCode));
    }

    @Override
    public PaymentTransactionResponse markPaymentSuccess(PaymentConfirmRequest request) {
        PaymentTransaction transaction = resolveTransaction(request);
        if (transaction.getStatus() == PaymentStatus.SUCCESS) {
            return PaymentTransactionResponse.from(transaction);
        }
        if (transaction.getStatus() == PaymentStatus.FAILED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Giao dich da bi huy");
        }

        transaction.setStatus(PaymentStatus.SUCCESS);
        transaction.setPaidAt(LocalDateTime.now());
        transaction.setUpdatedAt(LocalDateTime.now());
        PaymentTransaction saved = paymentTransactionRepository.save(transaction);

        unlockPurchasedTarget(saved);
        return PaymentTransactionResponse.from(saved);
    }

    @Override
    public PaymentTransactionResponse markPaymentFailed(PaymentConfirmRequest request) {
        PaymentTransaction transaction = resolveTransaction(request);
        if (transaction.getStatus() == PaymentStatus.SUCCESS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Giao dich da thanh cong");
        }
        if (transaction.getStatus() != PaymentStatus.FAILED) {
            transaction.setStatus(PaymentStatus.FAILED);
            transaction.setUpdatedAt(LocalDateTime.now());
            transaction = paymentTransactionRepository.save(transaction);
        }
        return PaymentTransactionResponse.from(transaction);
    }

    @Override
    public PaymentEntitlementsResponse getCurrentEntitlements() {
        User currentUser = currentUserService.getCurrentUser();
        logger.debug("Fetching entitlements for user {}", currentUser.getEmail());
        PaymentEntitlementsResponse response = new PaymentEntitlementsResponse();
        response.setUserId(currentUser.getId());
        SubscriptionPlan effectivePlan = subscriptionService.getUserSubscription(currentUser.getId())
                .filter(subscription -> subscription.getStatus() == SubscriptionStatus.ACTIVE)
                .map(subscription -> subscription.getPlanType() != null ? subscription.getPlanType() : SubscriptionPlan.BASIC)
                .orElse(SubscriptionPlan.BASIC);
        response.setSubscriptionPlan(effectivePlan.name());
        if (currentUser.getUnlockedMovieIds() == null) {
            currentUser.setUnlockedMovieIds(new HashSet<>());
        }
        response.setUnlockedMovieIds(currentUser.getUnlockedMovieIds().stream().sorted().toList());
        return response;
    }

    private PaymentTransaction resolveTransaction(PaymentConfirmRequest request) {
        if (request.getTxnCode() != null && !request.getTxnCode().isBlank()) {
            return findByTxnCode(request.getTxnCode());
        }

        if (request.getPaymentId() == null || request.getPaymentId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "txnCode is required");
        }

        return paymentTransactionRepository.findById(request.getPaymentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment transaction not found"));
    }

    private PaymentTransaction findByTxnCode(String txnCode) {
        if (txnCode == null || txnCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "txnCode is required");
        }

        return paymentTransactionRepository.findByTxnCode(txnCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment transaction not found"));
    }

    private void unlockPurchasedTarget(PaymentTransaction transaction) {
        if (transaction.getTargetType() == PaymentTargetType.PACKAGE) {
            subscriptionService.activateSubscription(transaction.getUserId(), transaction.getPlanType());
            return;
        }

        if (transaction.getMovieId() == null || transaction.getMovieId().isBlank()) {
            return;
        }

        User user = userRepository.findById(transaction.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getUnlockedMovieIds() == null) {
            user.setUnlockedMovieIds(new HashSet<>());
        }
        user.getUnlockedMovieIds().add(transaction.getMovieId());
        userRepository.save(user);
    }

    private TargetDescriptor resolveTarget(PaymentCreateRequest request) {
        String movieId = normalize(request.getMovieId());
        String packageId = normalize(request.getPackageId());
        SubscriptionPlan planType = request.getPlanType();

        if (movieId != null && (packageId != null || planType != null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chi duoc thanh toan cho phim hoac goi, khong dong thoi ca hai");
        }

        if (movieId != null) {
            Movie movie = movieRepository.findById(movieId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Movie not found"));
            SubscriptionPlan requiredPlan = resolveSubscriptionPlan(movie.getRequiredSubscription());
            return new TargetDescriptor(PaymentTargetType.MOVIE, movie.getId(), null, requiredPlan, movie.getTitle());
        }

        SubscriptionPlan resolvedPlan = planType;
        if (resolvedPlan == null && packageId != null) {
            try {
                resolvedPlan = SubscriptionPlan.valueOf(packageId.toUpperCase());
            } catch (IllegalArgumentException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "packageId is invalid");
            }
        }
        if (resolvedPlan == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "movieId or packageId is required");
        }

        String resolvedPackageId = packageId != null ? packageId.toUpperCase() : resolvedPlan.name();
        return new TargetDescriptor(PaymentTargetType.PACKAGE, null, resolvedPackageId, resolvedPlan, resolvedPlan.name());
    }

    private BigDecimal resolveAmount(PaymentCreateRequest request, TargetDescriptor target) {
        if (request.getAmount() != null && request.getAmount().compareTo(BigDecimal.ZERO) > 0) {
            return request.getAmount();
        }

        SubscriptionPlan effectivePlan = resolveSubscriptionPlan(target.planType());

        if (target.targetType() == PaymentTargetType.PACKAGE) {
            return switch (effectivePlan) {
                case BASIC -> new BigDecimal("10000");
                case STANDARD -> new BigDecimal("49000");
                case PREMIUM -> new BigDecimal("99000");
            };
        }

        return switch (effectivePlan) {
            case BASIC -> new BigDecimal("12000");
            case STANDARD -> new BigDecimal("19000");
            case PREMIUM -> new BigDecimal("29000");
        };
    }

    private String resolveCurrency(PaymentCreateRequest request) {
        String currency = normalize(request.getCurrency());
        return currency != null ? currency.toUpperCase() : "VND";
    }

    private String buildPaymentContent(TargetDescriptor target, String txnCode) {
        if (target.targetType() == PaymentTargetType.MOVIE) {
            return "MOVIEX MOVIE " + txnCode;
        }
        return "MOVIEX PACKAGE " + txnCode;
    }

    private String resolveRedirectPath(PaymentCreateRequest request, TargetDescriptor target) {
        String redirectPath = normalize(request.getRedirectPath());
        if (redirectPath != null) {
            return redirectPath;
        }
        if (target.targetType() == PaymentTargetType.MOVIE && target.movieId() != null) {
            return "/browse?play=" + target.movieId();
        }
        return "/browse";
    }

    private String generateTxnCode() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        return String.format("TXN_%s_%s", LocalDate.now().format(TXN_DAY_FORMAT), suffix);
    }

    private String normalize(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private SubscriptionPlan resolveSubscriptionPlan(SubscriptionPlan plan) {
        return plan != null ? plan : SubscriptionPlan.BASIC;
    }

    private record TargetDescriptor(
            PaymentTargetType targetType,
            String movieId,
            String packageId,
            SubscriptionPlan planType,
            String displayName
    ) {
    }
}
