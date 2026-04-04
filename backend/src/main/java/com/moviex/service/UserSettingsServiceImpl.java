package com.moviex.service;

import com.moviex.dto.UserSettingsRequest;
import com.moviex.model.User;
import com.moviex.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserSettingsServiceImpl implements UserSettingsService {

    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    public UserSettingsServiceImpl(UserRepository userRepository, CurrentUserService currentUserService) {
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
    }

    @Override
    public User updateSettings(UserSettingsRequest request) {
        User user = currentUserService.getCurrentUser();

        if (request.getLanguage() != null) {
            user.setLanguage(request.getLanguage());
        }
        if (request.getDarkMode() != null) {
            user.setDarkMode(request.getDarkMode());
        }
        if (request.getSubtitle() != null) {
            user.setSubtitle(request.getSubtitle());
        }

        return userRepository.save(user);
    }
}
