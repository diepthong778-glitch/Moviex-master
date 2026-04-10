package com.moviex.cinema.dto;

import com.moviex.cinema.model.BookingStatus;
import com.moviex.cinema.model.CinemaPaymentStatus;
import com.moviex.cinema.model.BookingPricingBreakdown;

import java.math.BigDecimal;
import java.util.List;

public class BookingResponse {
    private String bookingId;
    private String showtimeId;
    private List<String> seatIds;
    private BigDecimal totalPrice;
    private BookingPricingBreakdown pricingBreakdown;
    private CinemaPaymentStatus paymentStatus;
    private BookingStatus bookingStatus;
    private String paymentTxnCode;
    private String paymentPageUrl;

    public BookingResponse() {}

    public BookingResponse(String bookingId, String showtimeId, List<String> seatIds, BigDecimal totalPrice,
                           CinemaPaymentStatus paymentStatus, BookingStatus bookingStatus, String paymentTxnCode) {
        this.bookingId = bookingId;
        this.showtimeId = showtimeId;
        this.seatIds = seatIds;
        this.totalPrice = totalPrice;
        this.paymentStatus = paymentStatus;
        this.bookingStatus = bookingStatus;
        this.paymentTxnCode = paymentTxnCode;
    }

    public String getBookingId() { return bookingId; }
    public void setBookingId(String bookingId) { this.bookingId = bookingId; }
    public String getShowtimeId() { return showtimeId; }
    public void setShowtimeId(String showtimeId) { this.showtimeId = showtimeId; }
    public List<String> getSeatIds() { return seatIds; }
    public void setSeatIds(List<String> seatIds) { this.seatIds = seatIds; }
    public BigDecimal getTotalPrice() { return totalPrice; }
    public void setTotalPrice(BigDecimal totalPrice) { this.totalPrice = totalPrice; }
    public BookingPricingBreakdown getPricingBreakdown() { return pricingBreakdown; }
    public void setPricingBreakdown(BookingPricingBreakdown pricingBreakdown) { this.pricingBreakdown = pricingBreakdown; }
    public CinemaPaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(CinemaPaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }
    public BookingStatus getBookingStatus() { return bookingStatus; }
    public void setBookingStatus(BookingStatus bookingStatus) { this.bookingStatus = bookingStatus; }
    public String getPaymentTxnCode() { return paymentTxnCode; }
    public void setPaymentTxnCode(String paymentTxnCode) { this.paymentTxnCode = paymentTxnCode; }
    public String getPaymentPageUrl() { return paymentPageUrl; }
    public void setPaymentPageUrl(String paymentPageUrl) { this.paymentPageUrl = paymentPageUrl; }
}
