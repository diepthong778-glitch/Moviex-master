package com.moviex.controller;

import com.moviex.model.SubscriptionPlan;
import com.moviex.model.User;
import com.moviex.repository.UserRepository;
import com.moviex.security.UserDetailsImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    private String getCurrentUserEmail() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) principal).getUsername();
        } else {
            return principal.toString();
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile() {
        String email = getCurrentUserEmail();
        Optional<User> user = userRepository.findByEmail(email);
        
        if (user.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        User foundUser = user.get();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", foundUser.getId());
        payload.put("username", foundUser.getUsername());
        payload.put("email", foundUser.getEmail());
        payload.put("phoneNumber", foundUser.getPhoneNumber());
        payload.put("gender", foundUser.getGender());
        payload.put("roles", foundUser.getRoles());
        payload.put("subscriptionPlan", foundUser.getSubscriptionPlan());
        payload.put("language", foundUser.getLanguage());
        payload.put("darkMode", foundUser.isDarkMode());
        payload.put("subtitle", foundUser.isSubtitle());
        payload.put("online", foundUser.isOnline());
        payload.put("currentlyWatching", foundUser.getCurrentlyWatching());
        payload.put("lastLoginAt", foundUser.getLastLoginAt());
        payload.put("lastSeenAt", foundUser.getLastSeenAt());
        return ResponseEntity.ok(payload);
    }

    @PostMapping("/watchlist/{movieId}")
    public ResponseEntity<?> addToWatchlist(@PathVariable String movieId) {
        String email = getCurrentUserEmail();
        User user = userRepository.findByEmail(email).orElseThrow();
        
        Set<String> watchlist = user.getWatchlist();
        watchlist.add(movieId);
        user.setWatchlist(watchlist);
        userRepository.save(user);

        return ResponseEntity.ok("Movie added to watchlist");
    }

    @DeleteMapping("/watchlist/{movieId}")
    public ResponseEntity<?> removeFromWatchlist(@PathVariable String movieId) {
        String email = getCurrentUserEmail();
        User user = userRepository.findByEmail(email).orElseThrow();
        
        Set<String> watchlist = user.getWatchlist();
        watchlist.remove(movieId);
        user.setWatchlist(watchlist);
        userRepository.save(user);

        return ResponseEntity.ok("Movie removed from watchlist");
    }

    @PostMapping("/subscribe/{plan}")
    public ResponseEntity<?> upgradeSubscription(@PathVariable String plan) {
        String email = getCurrentUserEmail();
        User user = userRepository.findByEmail(email).orElseThrow();
        
        try {
            SubscriptionPlan newPlan = SubscriptionPlan.valueOf(plan.toUpperCase());
            user.setSubscriptionPlan(newPlan);
            userRepository.save(user);
            return ResponseEntity.ok("Subscription upgraded to: " + newPlan);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid subscription plan");
        }
    }
}
