package com.moviex.cinema.service;

import com.moviex.cinema.dto.TicketResponse;
import com.moviex.cinema.model.Ticket;
import com.moviex.cinema.repository.TicketRepository;
import com.moviex.model.User;
import com.moviex.service.CurrentUserService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TicketService {
    private final TicketRepository ticketRepository;
    private final CurrentUserService currentUserService;

    public TicketService(TicketRepository ticketRepository, CurrentUserService currentUserService) {
        this.ticketRepository = ticketRepository;
        this.currentUserService = currentUserService;
    }

    public List<TicketResponse> listTicketsForCurrentUser() {
        User currentUser = currentUserService.getCurrentUser();
        return ticketRepository.findByUserId(currentUser.getId()).stream()
                .map(ticket -> new TicketResponse(
                        ticket.getId(),
                        ticket.getTicketCode(),
                        ticket.getSeatId(),
                        ticket.getShowtimeId(),
                        ticket.getIssuedAt()))
                .collect(Collectors.toList());
    }
}
