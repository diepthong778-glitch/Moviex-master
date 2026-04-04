package com.moviex.dto;

public class EmailExistsResponse {
    private boolean exists;

    public EmailExistsResponse(boolean exists) {
        this.exists = exists;
    }

    public boolean isExists() {
        return exists;
    }

    public void setExists(boolean exists) {
        this.exists = exists;
    }
}

