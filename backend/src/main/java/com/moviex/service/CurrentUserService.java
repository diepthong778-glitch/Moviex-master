package com.moviex.service;

import com.moviex.model.User;
import com.moviex.repository.UserRepository;
import com.moviex.security.UserDetailsImpl;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser() {
        return userRepository.findByEmail(getCurrentUserEmail())
                .orElseThrow(() -> new IllegalStateException("Current user not found"));
    }

    public String getCurrentUserEmail() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsImpl userDetails) {
            return userDetails.getUsername();
        }

        return principal.toString();
    }
}
