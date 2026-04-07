package com.moviex.cinema.controller;

import com.moviex.cinema.dto.TicketResponse;
import com.moviex.cinema.service.TicketService;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<List<TicketResponse>> listTickets() {
        return ResponseEntity.ok(ticketService.listTicketsForCurrentUser());
    }
}
