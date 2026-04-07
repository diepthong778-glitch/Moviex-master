package com.moviex.cinema.service;

import com.moviex.cinema.dto.BookingResponse;
import com.moviex.cinema.dto.CreatePaymentRequest;
import com.moviex.cinema.model.Booking;
import com.moviex.cinema.model.BookingSeat;
import com.moviex.cinema.model.BookingStatus;
import com.moviex.cinema.model.CinemaPaymentStatus;
import com.moviex.cinema.model.PaymentTransaction;
import com.moviex.cinema.model.Ticket;
import com.moviex.cinema.model.TicketStatus;
import com.moviex.cinema.repository.BookingRepository;
import com.moviex.cinema.repository.CinemaPaymentTransactionRepository;
import com.moviex.cinema.repository.TicketRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CinemaPaymentService {
    private final BookingRepository bookingRepository;
    private final CinemaPaymentTransactionRepository paymentRepository;
    private final TicketRepository ticketRepository;

    public CinemaPaymentService(BookingRepository bookingRepository,
                                CinemaPaymentTransactionRepository paymentRepository,
                                TicketRepository ticketRepository) {
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.ticketRepository = ticketRepository;
    }

    public BookingResponse createPayment(CreatePaymentRequest request) {
        if (request.getBookingId() == null || request.getBookingId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bookingId is required");
        }

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (booking.getBookingStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking is not pending");
        }

        LocalDateTime now = LocalDateTime.now();
        if (booking.getHoldExpiresAt() == null || booking.getHoldExpiresAt().isBefore(now)) {
            booking.setBookingStatus(BookingStatus.EXPIRED);
            booking.setPaymentStatus(CinemaPaymentStatus.FAILED);
            booking.setUpdatedAt(now);
            bookingRepository.save(booking);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking hold expired");
        }

        PaymentTransaction txn = new PaymentTransaction();
        txn.setBookingId(booking.getId());
        txn.setAmount(booking.getTotalPrice());
        txn.setStatus(CinemaPaymentStatus.PENDING);
        txn.setTxnCode(UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        txn.setCreatedAt(LocalDateTime.now());
        txn.setUpdatedAt(LocalDateTime.now());
        paymentRepository.save(txn);

        List<String> seatIds = booking.getSeats().stream().map(BookingSeat::getSeatId).collect(Collectors.toList());
        return new BookingResponse(
                booking.getId(),
                booking.getShowtimeId(),
                seatIds,
                booking.getTotalPrice(),
                booking.getPaymentStatus(),
                booking.getBookingStatus(),
                txn.getTxnCode()
        );
    }

    public BookingResponse confirmPayment(String txnCode, boolean success) {
        PaymentTransaction transaction = paymentRepository.findByTxnCode(txnCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment transaction not found"));

        Booking booking = bookingRepository.findById(transaction.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        LocalDateTime now = LocalDateTime.now();
        if (booking.getBookingStatus() == BookingStatus.PENDING
                && (booking.getHoldExpiresAt() == null || booking.getHoldExpiresAt().isBefore(now))) {
            booking.setBookingStatus(BookingStatus.EXPIRED);
            booking.setPaymentStatus(CinemaPaymentStatus.FAILED);
            booking.setUpdatedAt(now);
            bookingRepository.save(booking);

            transaction.setStatus(CinemaPaymentStatus.FAILED);
            transaction.setUpdatedAt(now);
            paymentRepository.save(transaction);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking hold expired");
        }

        if (success) {
            List<Booking> activeBookings = bookingRepository.findByShowtimeIdAndBookingStatusIn(
                    booking.getShowtimeId(),
                    List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED)
            );
            for (Booking other : activeBookings) {
                if (other.getId().equals(booking.getId())) {
                    continue;
                }
                if (other.getBookingStatus() == BookingStatus.PENDING
                        && (other.getHoldExpiresAt() == null || other.getHoldExpiresAt().isBefore(now))) {
                    other.setBookingStatus(BookingStatus.EXPIRED);
                    other.setUpdatedAt(now);
                    bookingRepository.save(other);
                    continue;
                }
                boolean conflicts = other.getSeats().stream().anyMatch(
                        seat -> booking.getSeats().stream().anyMatch(
                                current -> current.getSeatId().equals(seat.getSeatId())
                        )
                );
                if (conflicts) {
                    transaction.setStatus(CinemaPaymentStatus.FAILED);
                    transaction.setUpdatedAt(now);
                    paymentRepository.save(transaction);

                    booking.setPaymentStatus(CinemaPaymentStatus.FAILED);
                    booking.setBookingStatus(BookingStatus.CANCELLED);
                    booking.setUpdatedAt(now);
                    bookingRepository.save(booking);
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Seats already booked");
                }
            }
        }

        transaction.setStatus(success ? CinemaPaymentStatus.PAID : CinemaPaymentStatus.FAILED);
        transaction.setUpdatedAt(now);
        paymentRepository.save(transaction);

        booking.setPaymentStatus(transaction.getStatus());
        booking.setBookingStatus(success ? BookingStatus.CONFIRMED : BookingStatus.CANCELLED);
        booking.setUpdatedAt(now);
        bookingRepository.save(booking);

        if (success) {
            List<Ticket> tickets = booking.getSeats().stream().map(seat -> {
                Ticket ticket = new Ticket();
                ticket.setBookingId(booking.getId());
                ticket.setUserId(booking.getUserId());
                ticket.setShowtimeId(booking.getShowtimeId());
                ticket.setCinemaId(booking.getCinemaId());
                ticket.setAuditoriumId(booking.getAuditoriumId());
                ticket.setSeatId(seat.getSeatId());
                ticket.setTicketCode(UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                ticket.setStatus(TicketStatus.ACTIVE);
                ticket.setIssuedAt(now);
                return ticket;
            }).toList();
            ticketRepository.saveAll(tickets);
        }

        List<String> seatIds = booking.getSeats().stream().map(BookingSeat::getSeatId).collect(Collectors.toList());
        return new BookingResponse(
                booking.getId(),
                booking.getShowtimeId(),
                seatIds,
                booking.getTotalPrice(),
                booking.getPaymentStatus(),
                booking.getBookingStatus(),
                transaction.getTxnCode()
        );
    }
}
