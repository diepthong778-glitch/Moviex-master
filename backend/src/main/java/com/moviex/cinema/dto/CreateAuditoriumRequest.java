package com.moviex.cinema.dto;

public class CreateAuditoriumRequest {
    private String cinemaId;
    private String name;
    private Integer capacity;
    private Boolean active;

    public CreateAuditoriumRequest() {}

    public String getCinemaId() { return cinemaId; }
    public void setCinemaId(String cinemaId) { this.cinemaId = cinemaId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
