package com.moviex.service;

import com.moviex.model.User;
import com.moviex.repository.UserRepository;
import com.moviex.security.UserDetailsImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CurrentUserService {

    private final UserRepository userRepository;
    private static final Logger logger = LoggerFactory.getLogger(CurrentUserService.class);

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser() {
        String email = getCurrentUserEmail();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    logger.error("User not found for email: {}", email);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
                });
    }

    public String getCurrentUserEmail() {
        if (SecurityContextHolder.getContext() == null || SecurityContextHolder.getContext().getAuthentication() == null) {
            logger.warn("No authentication found in security context");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsImpl userDetails) {
            logger.debug("Resolved current user email from UserDetailsImpl");
            return userDetails.getUsername();
        }

        if (principal instanceof String strPrincipal) {
            if ("anonymousUser".equalsIgnoreCase(strPrincipal)) {
                logger.warn("Anonymous user attempted to access protected resource");
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
            }
            return strPrincipal;
        }

        logger.error("Unsupported principal type: {}", principal.getClass().getName());
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
    }
}
