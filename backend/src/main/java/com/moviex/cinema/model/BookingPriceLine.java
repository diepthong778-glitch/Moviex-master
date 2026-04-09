package com.moviex.cinema.model;

import java.math.BigDecimal;

public class BookingPriceLine {
    private String seatId;
    private String seatLabel;
    private String row;
    private Integer number;
    private SeatType seatType;
    private String pricingRule;
    private BigDecimal unitPrice = BigDecimal.ZERO;
    private BigDecimal lineTotal = BigDecimal.ZERO;

    public BookingPriceLine() {}

    public String getSeatId() { return seatId; }
    public void setSeatId(String seatId) { this.seatId = seatId; }
    public String getSeatLabel() { return seatLabel; }
    public void setSeatLabel(String seatLabel) { this.seatLabel = seatLabel; }
    public String getRow() { return row; }
    public void setRow(String row) { this.row = row; }
    public Integer getNumber() { return number; }
    public void setNumber(Integer number) { this.number = number; }
    public SeatType getSeatType() { return seatType; }
    public void setSeatType(SeatType seatType) { this.seatType = seatType; }
    public String getPricingRule() { return pricingRule; }
    public void setPricingRule(String pricingRule) { this.pricingRule = pricingRule; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
    public BigDecimal getLineTotal() { return lineTotal; }
    public void setLineTotal(BigDecimal lineTotal) { this.lineTotal = lineTotal; }
}
