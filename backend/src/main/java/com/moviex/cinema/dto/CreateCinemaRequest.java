package com.moviex.cinema.dto;

public class CreateCinemaRequest {
    private String name;
    private String address;
    private String city;
    private Boolean active;

    public CreateCinemaRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
