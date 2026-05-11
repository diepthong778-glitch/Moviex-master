package com.moviex.cinema.repository;

import com.moviex.cinema.model.Ticket;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends MongoRepository<Ticket, String> {
    List<Ticket> findByUserId(String userId);
    List<Ticket> findByBookingId(String bookingId);
    Optional<Ticket> findByTicketCode(String ticketCode);
    Optional<Ticket> findByQrToken(String qrToken);
}
