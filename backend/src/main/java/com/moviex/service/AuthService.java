package com.moviex.service;

import com.moviex.dto.ChangePasswordRequest;
import com.moviex.dto.ForgotPasswordRequest;
import com.moviex.dto.JwtResponse;
import com.moviex.dto.LoginRequest;
import com.moviex.dto.MessageResponse;
import com.moviex.dto.RegisterRequest;
import com.moviex.model.Gender;
import com.moviex.model.Role;
import com.moviex.model.User;
import com.moviex.repository.UserRepository;
import com.moviex.security.JwtUtils;
import com.moviex.security.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AuthService {
    private static final String TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static final int TEMP_PASSWORD_LENGTH = 10;

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final EmailService emailService;
    private final RealtimeActivityService realtimeActivityService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(AuthenticationManager authenticationManager, UserRepository userRepository,
                       PasswordEncoder passwordEncoder, JwtUtils jwtUtils, EmailService emailService,
                       RealtimeActivityService realtimeActivityService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
        this.emailService = emailService;
        this.realtimeActivityService = realtimeActivityService;
    }

    public JwtResponse authenticateUser(@Valid LoginRequest loginRequest) {
        Optional<User> userOptional = userRepository.findByEmail(loginRequest.getEmail());
        if (userOptional.isPresent() && !userOptional.get().isVerified()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error: Email is not verified!");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        User loggedUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));

        loggedUser.setOnline(true);
        loggedUser.setLastLoginAt(LocalDateTime.now());
        loggedUser.setLastSeenAt(LocalDateTime.now());
        userRepository.save(loggedUser);
        realtimeActivityService.userLogin(loggedUser);

        return buildJwtResponse(jwt, loggedUser, roles);
    }

    public MessageResponse registerUser(@Valid RegisterRequest registerRequest) {
        if (!registerRequest.getPassword().equals(registerRequest.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error: Passwords do not match!");
        }

        String normalizedEmail = normalizeEmail(registerRequest.getEmail());
        String normalizedUsername = normalizeUsername(registerRequest.getUsername());
        String normalizedPhoneNumber = normalizePhoneNumber(registerRequest.getPhoneNumber());

        if (Boolean.TRUE.equals(userRepository.existsByUsername(normalizedUsername))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error: Username is already taken!");
        }

        if (Boolean.TRUE.equals(userRepository.existsByEmail(normalizedEmail))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error: Email is already in use!");
        }

        User user = new User();
        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setPhoneNumber(normalizedPhoneNumber);
        user.setGender(resolveGender(registerRequest.getGender()));
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.getRoles().add(Role.ROLE_USER);

        String token = UUID.randomUUID().toString();
        user.setVerificationToken(token);
        user.setVerified(false);

        userRepository.save(user);
        new Thread(() -> emailService.sendVerificationEmail(user.getEmail(), token)).start();

        return new MessageResponse("User registered successfully! Please check your email.");
    }

    public MessageResponse verifyEmail(String token) {
        User verifiedUser = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error: Invalid verification token!"));

        if (verifiedUser.isVerified()) {
            return new MessageResponse("Email is already verified!");
        }

        verifiedUser.setVerified(true);
        verifiedUser.setVerificationToken(null);
        userRepository.save(verifiedUser);

        return new MessageResponse("Email verified successfully! You can now login.");
    }

    public MessageResponse forgotPassword(@Valid ForgotPasswordRequest request) {
        Optional<User> userOptional = userRepository.findByEmail(normalizeEmail(request.getEmail()));
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            String temporaryPassword = generateTemporaryPassword();
            user.setPassword(passwordEncoder.encode(temporaryPassword));
            userRepository.save(user);
            emailService.sendTemporaryPassword(user.getEmail(), temporaryPassword);
        }

        return new MessageResponse("If that email exists, a temporary password has been sent.");
    }

    public MessageResponse changePassword(@Valid ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmNewPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error: New passwords do not match!");
        }

        User currentUser = getCurrentAuthenticatedUser();
        String normalizedPhoneNumber = normalizePhoneNumber(request.getPhoneNumber());

        if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error: Current password is incorrect!");
        }

        if (!normalizedPhoneNumber.equals(normalizePhoneNumber(currentUser.getPhoneNumber()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error: Phone number does not match our records!");
        }

        if (passwordEncoder.matches(request.getNewPassword(), currentUser.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error: New password must be different from the current password!");
        }

        currentUser.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(currentUser);

        return new MessageResponse("Password changed successfully.");
    }

    public MessageResponse logout() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl userDetails) {
            userRepository.findByEmail(userDetails.getUsername()).ifPresent(user -> {
                user.setOnline(false);
                user.setLastSeenAt(LocalDateTime.now());
                userRepository.save(user);
                realtimeActivityService.userLogout(user);
            });
        }

        SecurityContextHolder.clearContext();
        return new MessageResponse("Logged out");
    }

    public boolean emailExists(String email) {
        return Boolean.TRUE.equals(userRepository.existsByEmail(normalizeEmail(email)));
    }

    private JwtResponse buildJwtResponse(String jwt, User user, List<String> roles) {
        return new JwtResponse(
                jwt,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getGender() == null ? null : user.getGender().name(),
                user.isVerified(),
                roles,
                user.getSubscriptionPlan().name()
        );
    }

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetailsImpl userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Error: Authentication is required!");
        }

        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Error: User not found!"));
    }

    private String generateTemporaryPassword() {
        StringBuilder builder = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (int i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
            builder.append(TEMP_PASSWORD_CHARS.charAt(secureRandom.nextInt(TEMP_PASSWORD_CHARS.length())));
        }
        return builder.toString();
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private String normalizeUsername(String username) {
        return username == null ? null : username.trim();
    }

    private String normalizePhoneNumber(String phoneNumber) {
        return phoneNumber == null ? null : phoneNumber.trim();
    }

    private Gender resolveGender(String gender) {
        try {
            return Gender.fromValue(gender);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Error: Invalid gender. Allowed values are MALE, FEMALE, LGBT!"
            );
        }
    }
}
