package com.moviex.model;

import java.util.Locale;

public enum Gender {
    MALE,
    FEMALE,
    LGBT;

    public static Gender fromValue(String value) {
        if (value == null) {
            return null;
        }

        return Gender.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
