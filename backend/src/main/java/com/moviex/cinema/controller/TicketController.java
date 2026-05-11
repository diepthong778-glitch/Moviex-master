package com.moviex.cinema.controller;

import com.moviex.cinema.dto.CinemaTicketViewResponse;
import com.moviex.cinema.dto.TicketScanRequest;
import com.moviex.cinema.dto.TicketScanResponse;
import com.moviex.cinema.service.TicketService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cinema/tickets")
public class TicketController {
    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @GetMapping
    public ResponseEntity<List<CinemaTicketViewResponse>> listUpcomingTickets() {
        return ResponseEntity.ok(ticketService.listUpcomingTicketsForCurrentUser());
    }

    @GetMapping("/upcoming")
    public ResponseEntity<List<CinemaTicketViewResponse>> listUpcomingTicketsAlias() {
        return ResponseEntity.ok(ticketService.listUpcomingTicketsForCurrentUser());
    }

    @GetMapping("/history")
    public ResponseEntity<List<CinemaTicketViewResponse>> listBookingHistory() {
        return ResponseEntity.ok(ticketService.listBookingHistoryForCurrentUser());
    }

    @GetMapping("/bookings/history")
    public ResponseEntity<List<CinemaTicketViewResponse>> listBookingHistoryAlias() {
        return ResponseEntity.ok(ticketService.listBookingHistoryForCurrentUser());
    }

    @GetMapping("/my")
    public ResponseEntity<List<CinemaTicketViewResponse>> listMyTickets(
            @RequestParam(defaultValue = "all") String segment) {
        return ResponseEntity.ok(ticketService.listMyTickets(segment));
    }

    @GetMapping("/code/{ticketCode}")
    public ResponseEntity<CinemaTicketViewResponse> getTicketDetailByCode(@PathVariable String ticketCode) {
        return ResponseEntity.ok(ticketService.getTicketDetailByCodeForCurrentUser(ticketCode));
    }

    @GetMapping("/validate/{ticketCode}")
    public ResponseEntity<CinemaTicketViewResponse> validateTicket(@PathVariable String ticketCode) {
        return ResponseEntity.ok(ticketService.getTicketValidationByCode(ticketCode));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/scan")
    public ResponseEntity<TicketScanResponse> scanTicket(@RequestBody TicketScanRequest request) {
        return ResponseEntity.ok(ticketService.scanTicket(request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/code/{ticketCode}/check-in")
    public ResponseEntity<CinemaTicketViewResponse> checkInTicket(@PathVariable String ticketCode) {
        return ResponseEntity.ok(ticketService.checkInTicketByCodeForAdmin(ticketCode));
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<CinemaTicketViewResponse> getTicketDetail(@PathVariable String bookingId) {
        return ResponseEntity.ok(ticketService.getTicketDetailForCurrentUser(bookingId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/bookings")
    public ResponseEntity<List<CinemaTicketViewResponse>> listBookingsForAdmin() {
        return ResponseEntity.ok(ticketService.listBookingHistoryForAdmin());
    }
}
