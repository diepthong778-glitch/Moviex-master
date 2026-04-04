package com.moviex.controller;

import com.moviex.dto.GrantAccessRequest;
import com.moviex.dto.SubscriptionResponse;
import com.moviex.dto.WatchHistoryResponse;
import com.moviex.model.Role;
import com.moviex.model.Subscription;
import com.moviex.model.SubscriptionStatus;
import com.moviex.model.User;
import com.moviex.repository.SubscriptionRepository;
import com.moviex.repository.UserRepository;
import com.moviex.service.SubscriptionService;
import com.moviex.service.WatchHistoryService;
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
    public ResponseEntity<List<Map<String, Object>>> getUsers() {
        Map<String, SubscriptionStatus> statusByUserId = subscriptionRepository.findAll().stream()
                .collect(Collectors.toMap(
                        Subscription::getUserId,
                        Subscription::getStatus,
                        (existing, replacement) -> replacement
                ));

        List<Map<String, Object>> users = userRepository.findAll().stream()
                .map(user -> toUserManagementRow(user, statusByUserId))
                .toList();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/subscriptions")
    public ResponseEntity<List<SubscriptionResponse>> getSubscriptions() {
        return ResponseEntity.ok(subscriptionService.getAllSubscriptions());
    }

    @GetMapping("/online-users")
    public ResponseEntity<List<Map<String, Object>>> getOnlineUsers() {
        List<Map<String, Object>> onlineUsers = userRepository.findByOnlineTrue().stream()
                .map(this::toOnlineUser)
                .toList();
        return ResponseEntity.ok(onlineUsers);
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

    private String topRole(Set<Role> roles) {
        if (roles == null || roles.isEmpty()) return "ROLE_USER";
        return roles.stream().map(Enum::name).collect(Collectors.joining(","));
    }

}
