package com.moviex.cinema.model;

import java.math.BigDecimal;

public class BookingSeat {
    private String seatId;
    private String row;
    private int number;
    private SeatType type;
    private BigDecimal price = BigDecimal.ZERO;

    public BookingSeat() {}

    public String getSeatId() { return seatId; }
    public void setSeatId(String seatId) { this.seatId = seatId; }
    public String getRow() { return row; }
    public void setRow(String row) { this.row = row; }
    public int getNumber() { return number; }
    public void setNumber(int number) { this.number = number; }
    public SeatType getType() { return type; }
    public void setType(SeatType type) { this.type = type; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
}
