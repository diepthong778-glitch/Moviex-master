package com.moviex.cinema.controller;

import com.moviex.cinema.dto.BookingResponse;
import com.moviex.cinema.dto.CreateBookingRequest;
import com.moviex.cinema.model.BookingPricingBreakdown;
import com.moviex.cinema.model.Booking;
import com.moviex.cinema.service.BookingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cinema/bookings")
public class BookingController {
    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(@RequestBody CreateBookingRequest request) {
        return ResponseEntity.ok(bookingService.createBooking(request));
    }

    @PostMapping("/quote")
    public ResponseEntity<BookingPricingBreakdown> quoteBooking(@RequestBody CreateBookingRequest request) {
        return ResponseEntity.ok(bookingService.quoteBooking(request));
    }

    @GetMapping
    public ResponseEntity<List<Booking>> listBookings() {
        return ResponseEntity.ok(bookingService.listBookingsForCurrentUser());
    }

    @PostMapping("/{bookingId}/release")
    public ResponseEntity<BookingResponse> releaseBooking(@PathVariable String bookingId) {
        return ResponseEntity.ok(bookingService.releaseBooking(bookingId));
    }
}
