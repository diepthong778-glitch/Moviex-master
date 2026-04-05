package com.moviex.controller;

import com.moviex.dto.GrantAccessRequest;
import com.moviex.dto.AdminSummaryResponse;
import com.moviex.dto.SubscriptionResponse;
import com.moviex.dto.WatchHistoryResponse;
import com.moviex.model.Role;
import com.moviex.model.SubscriptionPlan;
import com.moviex.model.Subscription;
import com.moviex.model.SubscriptionStatus;
import com.moviex.model.User;
import com.moviex.repository.SubscriptionRepository;
import com.moviex.repository.UserRepository;
import com.moviex.service.SubscriptionService;
import com.moviex.service.WatchHistoryService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminManagementController {

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionService subscriptionService;
    private final WatchHistoryService watchHistoryService;

    public AdminManagementController(UserRepository userRepository,
                                     SubscriptionRepository subscriptionRepository,
                                     SubscriptionService subscriptionService,
                                     WatchHistoryService watchHistoryService) {
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionService = subscriptionService;
        this.watchHistoryService = watchHistoryService;
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        int resolvedPage = Math.max(0, page);
        int resolvedSize = Math.max(1, Math.min(size, 200));
        List<User> pageUsers = userRepository.findAll(PageRequest.of(resolvedPage, resolvedSize, Sort.by("email").ascending())).stream().toList();
        Map<String, SubscriptionStatus> statusByUserId = subscriptionRepository.findByUserIdIn(
                        pageUsers.stream().map(User::getId).toList())
                .stream()
                .collect(Collectors.toMap(
                        Subscription::getUserId,
                        Subscription::getStatus,
                        (existing, replacement) -> replacement
                ));

        List<Map<String, Object>> users = pageUsers.stream()
                .map(user -> toUserManagementRow(user, statusByUserId))
                .toList();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/subscriptions")
    public ResponseEntity<List<SubscriptionResponse>> getSubscriptions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        int resolvedPage = Math.max(0, page);
        int resolvedSize = Math.max(1, Math.min(size, 200));
        List<SubscriptionResponse> subscriptions = subscriptionRepository.findAll(
                        PageRequest.of(resolvedPage, resolvedSize, Sort.by("createdAt").descending()))
                .stream()
                .map(this::toSubscriptionResponse)
                .toList();
        return ResponseEntity.ok(subscriptions);
    }

    @GetMapping("/online-users")
    public ResponseEntity<List<Map<String, Object>>> getOnlineUsers() {
        List<Map<String, Object>> onlineUsers = userRepository.findByOnlineTrue().stream()
                .map(this::toOnlineUser)
                .toList();
        return ResponseEntity.ok(onlineUsers);
    }

    @GetMapping("/summary")
    public ResponseEntity<AdminSummaryResponse> getSummary() {
        AdminSummaryResponse summary = new AdminSummaryResponse();
        summary.setTotalUsers(userRepository.count());
        summary.setActiveSubscriptions(subscriptionRepository.countByStatus(SubscriptionStatus.ACTIVE));
        summary.setOnlineUsers(userRepository.countByOnlineTrue());

        Map<String, Long> usersByPlan = new LinkedHashMap<>();
        usersByPlan.put(SubscriptionPlan.BASIC.name(), userRepository.countBySubscriptionPlan(SubscriptionPlan.BASIC));
        usersByPlan.put(SubscriptionPlan.STANDARD.name(), userRepository.countBySubscriptionPlan(SubscriptionPlan.STANDARD));
        usersByPlan.put(SubscriptionPlan.PREMIUM.name(), userRepository.countBySubscriptionPlan(SubscriptionPlan.PREMIUM));
        usersByPlan.put("NONE", 0L);
        summary.setUsersByPlan(usersByPlan);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/watch-history")
    public ResponseEntity<List<WatchHistoryResponse>> getWatchHistory(
            @RequestParam(defaultValue = "200") int limit) {
        return ResponseEntity.ok(watchHistoryService.adminGetAllHistory(limit));
    }

    @PutMapping("/grant-access")
    public ResponseEntity<SubscriptionResponse> grantAccess(@RequestBody GrantAccessRequest request) {
        if (request.getUserId() == null || request.getUserId().isBlank() || request.getPlanType() == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(
                subscriptionService.grantAccess(request.getUserId(), request.getPlanType(), request.getDurationDays())
        );
    }

    private Map<String, Object> toUserManagementRow(User user, Map<String, SubscriptionStatus> statusByUserId) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", user.getId());
        row.put("email", user.getEmail());
        row.put("role", topRole(user.getRoles()));
        row.put("plan", user.getSubscriptionPlan());
        row.put("status", statusByUserId.getOrDefault(user.getId(), SubscriptionStatus.EXPIRED).name());
        row.put("currentlyWatching", user.getCurrentlyWatching());
        row.put("lastLogin", user.getLastLoginAt());
        row.put("online", user.isOnline());
        return row;
    }

    private Map<String, Object> toOnlineUser(User user) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("userId", user.getId());
        row.put("email", user.getEmail());
        row.put("currentlyWatching", user.getCurrentlyWatching());
        row.put("lastSeenAt", user.getLastSeenAt());
        row.put("lastLoginAt", user.getLastLoginAt());
        return row;
    }

    private SubscriptionResponse toSubscriptionResponse(Subscription subscription) {
        SubscriptionResponse response = new SubscriptionResponse();
        response.setId(subscription.getId());
        response.setUserId(subscription.getUserId());
        response.setPlanType(subscription.getPlanType());
        response.setStartDate(subscription.getStartDate());
        response.setEndDate(subscription.getEndDate());
        response.setRemainingDays(subscription.getRemainingDays());
        response.setStatus(subscription.getStatus());
        response.setActive(subscription.getStatus() == SubscriptionStatus.ACTIVE);
        response.setCreatedAt(subscription.getCreatedAt());
        return response;
    }

    private String topRole(Set<Role> roles) {
        if (roles == null || roles.isEmpty()) return "ROLE_USER";
        return roles.stream().map(Enum::name).collect(Collectors.joining(","));
    }

}
