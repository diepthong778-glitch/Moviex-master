package com.moviex.controller;

import com.moviex.dto.UserSettingsRequest;
import com.moviex.model.User;
import com.moviex.service.UserSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserSettingsController {

    private final UserSettingsService userSettingsService;

    public UserSettingsController(UserSettingsService userSettingsService) {
        this.userSettingsService = userSettingsService;
    }

    @PutMapping("/settings")
    public ResponseEntity<User> updateSettings(@RequestBody UserSettingsRequest request) {
        User user = userSettingsService.updateSettings(request);
        user.setPassword(null);
        user.setVerificationToken(null);
        return ResponseEntity.ok(user);
    }
}
