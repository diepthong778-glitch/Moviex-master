package com.moviex.service;

import com.moviex.dto.UserSettingsRequest;
import com.moviex.model.User;

public interface UserSettingsService {
    User updateSettings(UserSettingsRequest request);
}
