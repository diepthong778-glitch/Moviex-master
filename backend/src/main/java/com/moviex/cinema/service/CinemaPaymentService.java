package com.moviex.cinema.service;

import com.moviex.cinema.dto.BookingResponse;
import com.moviex.cinema.dto.CinemaPaymentTransactionResponse;
import com.moviex.cinema.dto.CreatePaymentRequest;
import com.moviex.cinema.dto.ShowtimeViewResponse;
import com.moviex.cinema.model.BookingPricingBreakdown;
import com.moviex.cinema.model.Booking;
import com.moviex.cinema.model.BookingSeat;
import com.moviex.cinema.model.BookingStatus;
import com.moviex.cinema.model.Cinema;
import com.moviex.cinema.model.CinemaPaymentStatus;
import com.moviex.cinema.model.Auditorium;
import com.moviex.cinema.model.MovieShowtime;
import com.moviex.cinema.model.PaymentTransaction;
import com.moviex.cinema.model.Ticket;
import com.moviex.cinema.model.TicketStatus;
import com.moviex.cinema.repository.AuditoriumRepository;
import com.moviex.cinema.repository.BookingRepository;
import com.moviex.cinema.repository.CinemaRepository;
import com.moviex.cinema.repository.CinemaPaymentTransactionRepository;
import com.moviex.cinema.repository.MovieShowtimeRepository;
import com.moviex.cinema.repository.TicketRepository;
import com.moviex.model.Movie;
import com.moviex.model.Role;
import com.moviex.model.User;
import com.moviex.repository.MovieRepository;
import com.moviex.service.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CinemaPaymentService {
    private static final java.util.Map<String, String> DEMO_MOVIE_TITLES = java.util.Map.of(
            "mvx-001", "Starlight Boulevard",
            "mvx-002", "Velocity Run",
            "mvx-003", "Nightfall Protocol",
            "mvx-004", "Golden Ticket"
    );

    private final BookingRepository bookingRepository;
    private final CinemaPaymentTransactionRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final MovieShowtimeRepository showtimeRepository;
    private final CinemaRepository cinemaRepository;
    private final AuditoriumRepository auditoriumRepository;
    private final MovieRepository movieRepository;
    private final BookingService bookingService;
    private final ShowtimeService showtimeService;
    private final CinemaPricingService cinemaPricingService;
    private final CinemaPaymentLinkService cinemaPaymentLinkService;
    private final SeatReservationService seatReservationService;
    private final CurrentUserService currentUserService;

    public CinemaPaymentService(BookingRepository bookingRepository,
                                CinemaPaymentTransactionRepository paymentRepository,
                                TicketRepository ticketRepository,
                                MovieShowtimeRepository showtimeRepository,
                                CinemaRepository cinemaRepository,
                                AuditoriumRepository auditoriumRepository,
                                MovieRepository movieRepository,
                                BookingService bookingService,
                                ShowtimeService showtimeService,
                                CinemaPricingService cinemaPricingService,
                                CinemaPaymentLinkService cinemaPaymentLinkService,
                                SeatReservationService seatReservationService,
                                CurrentUserService currentUserService) {
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.ticketRepository = ticketRepository;
        this.showtimeRepository = showtimeRepository;
        this.cinemaRepository = cinemaRepository;
        this.auditoriumRepository = auditoriumRepository;
        this.movieRepository = movieRepository;
        this.bookingService = bookingService;
        this.showtimeService = showtimeService;
        this.cinemaPricingService = cinemaPricingService;
        this.cinemaPaymentLinkService = cinemaPaymentLinkService;
        this.seatReservationService = seatReservationService;
        this.currentUserService = currentUserService;
    }

    public BookingResponse createPayment(CreatePaymentRequest request) {
        if (request.getBookingId() == null || request.getBookingId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bookingId is required");
        }

        bookingService.expirePendingBookings();
        User currentUser = currentUserService.getCurrentUser();
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        validateBookingOwnership(currentUser, booking);

        if (booking.getBookingStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking is not pending");
        }

        resolvePricingBreakdown(booking);
        if (!seatReservationService.hasActiveReservation(booking.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Seat reservation is no longer valid");
        }

        java.util.Optional<PaymentTransaction> existingPending = paymentRepository.findByBookingIdAndStatus(
                booking.getId(),
                CinemaPaymentStatus.PENDING
        );
        if (existingPending.isPresent()) {
            PaymentTransaction existingTransaction = ensurePaymentPageUrl(existingPending.get());
            return toBookingResponse(booking, existingTransaction);
        }

        PaymentTransaction txn = new PaymentTransaction();
        txn.setBookingId(booking.getId());
        txn.setAmount(booking.getTotalPrice());
        txn.setStatus(CinemaPaymentStatus.PENDING);
        txn.setTxnCode(UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        txn.setPaymentPageUrl(cinemaPaymentLinkService.buildPaymentPageUrl(txn.getTxnCode()));
        txn.setCreatedAt(LocalDateTime.now());
        txn.setUpdatedAt(LocalDateTime.now());
        paymentRepository.save(txn);

        return toBookingResponse(booking, txn);
    }

    public BookingResponse confirmPayment(String txnCode, boolean success) {
        PaymentTransaction transaction = finalizePayment(txnCode, success, true);
        Booking booking = bookingRepository.findById(transaction.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        return toBookingResponse(booking, transaction);
    }

    public CinemaPaymentTransactionResponse getPublicPaymentTransaction(String txnCode) {
        bookingService.expirePendingBookings();
        PaymentTransaction transaction = paymentRepository.findByTxnCode(txnCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment transaction not found"));
        transaction = ensurePaymentPageUrl(transaction);
        Booking booking = bookingRepository.findById(transaction.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        transaction = synchronizeTransactionStatus(transaction, booking);
        return toPaymentTransactionResponse(transaction, booking);
    }

    public CinemaPaymentTransactionResponse confirmPaymentPublic(String txnCode) {
        PaymentTransaction transaction = finalizePayment(txnCode, true, false);
        Booking booking = bookingRepository.findById(transaction.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        return toPaymentTransactionResponse(transaction, booking);
    }

    public CinemaPaymentTransactionResponse failPaymentPublic(String txnCode) {
        PaymentTransaction transaction = finalizePayment(txnCode, false, false);
        Booking booking = bookingRepository.findById(transaction.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        return toPaymentTransactionResponse(transaction, booking);
    }

    private BookingResponse toBookingResponse(Booking booking, PaymentTransaction transaction) {
        List<String> seatIds = booking.getSeats().stream().map(BookingSeat::getSeatId).collect(Collectors.toList());
        BookingResponse response = new BookingResponse();
        response.setBookingId(booking.getId());
        response.setShowtimeId(booking.getShowtimeId());
        response.setSeatIds(seatIds);
        response.setTotalPrice(booking.getTotalPrice());
        response.setPricingBreakdown(resolvePricingBreakdown(booking));
        response.setPaymentStatus(booking.getPaymentStatus());
        response.setBookingStatus(booking.getBookingStatus());
        response.setPaymentTxnCode(transaction == null ? null : transaction.getTxnCode());
        response.setPaymentPageUrl(transaction == null ? null : transaction.getPaymentPageUrl());
        return response;
    }

    private PaymentTransaction finalizePayment(String txnCode, boolean success, boolean validateOwnership) {
        bookingService.expirePendingBookings();
        PaymentTransaction transaction = paymentRepository.findByTxnCode(txnCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment transaction not found"));
        transaction = ensurePaymentPageUrl(transaction);

        Booking booking = bookingRepository.findById(transaction.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        transaction = synchronizeTransactionStatus(transaction, booking);

        if (validateOwnership) {
            User currentUser = currentUserService.getCurrentUser();
            validateBookingOwnership(currentUser, booking);
        }

        if (transaction.getStatus() != CinemaPaymentStatus.PENDING) {
            return transaction;
        }

        LocalDateTime now = LocalDateTime.now();
        if (!success) {
            transaction.setStatus(CinemaPaymentStatus.FAILED);
            transaction.setUpdatedAt(now);
            PaymentTransaction savedTransaction = paymentRepository.save(transaction);

            if (booking.getBookingStatus() == BookingStatus.PENDING) {
                seatReservationService.releaseReservedSeats(booking);
                booking.setBookingStatus(BookingStatus.CANCELLED);
                booking.setPaymentStatus(CinemaPaymentStatus.FAILED);
                booking.setUpdatedAt(now);
                bookingRepository.save(booking);
            }
            return savedTransaction;
        }

        if (booking.getBookingStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking is not pending");
        }

        seatReservationService.confirmReservedSeats(booking);

        transaction.setStatus(CinemaPaymentStatus.PAID);
        transaction.setUpdatedAt(now);
        PaymentTransaction savedTransaction = paymentRepository.save(transaction);

        booking.setPaymentStatus(CinemaPaymentStatus.PAID);
        booking.setBookingStatus(BookingStatus.CONFIRMED);
        booking.setUpdatedAt(now);
        bookingRepository.save(booking);

        issueTicketsIfNeeded(booking, now);
        return savedTransaction;
    }

    private CinemaPaymentTransactionResponse toPaymentTransactionResponse(PaymentTransaction transaction, Booking booking) {
        MovieShowtime showtime = booking == null || booking.getShowtimeId() == null
                ? null
                : showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        Cinema cinema = booking == null || booking.getCinemaId() == null
                ? null
                : cinemaRepository.findById(booking.getCinemaId()).orElse(null);
        Auditorium auditorium = booking == null || booking.getAuditoriumId() == null
                ? null
                : auditoriumRepository.findById(booking.getAuditoriumId()).orElse(null);
        Movie movie = (showtime != null && showtime.getMovieId() != null)
                ? movieRepository.findById(showtime.getMovieId()).orElse(null)
                : null;

        CinemaPaymentTransactionResponse response = new CinemaPaymentTransactionResponse();
        response.setBookingId(booking == null ? null : booking.getId());
        response.setBookingCode(booking == null ? null : booking.getBookingCode());
        response.setTxnCode(transaction.getTxnCode());
        response.setAmount(transaction.getAmount());
        response.setStatus(transaction.getStatus());
        response.setBookingStatus(booking == null ? null : booking.getBookingStatus());
        response.setPaymentStatus(booking == null ? transaction.getStatus() : booking.getPaymentStatus());
        response.setProvider(transaction.getProvider());
        response.setPaymentPageUrl(transaction.getPaymentPageUrl());
        response.setMovieTitle(resolveMovieTitle(showtime, movie));
        response.setCinemaName(cinema == null ? null : cinema.getName());
        response.setAuditoriumName(auditorium == null ? null : auditorium.getName());
        response.setShowDate(showtime == null ? null : showtime.getShowDate());
        response.setStartTime(showtime == null ? null : showtime.getStartTime());
        response.setEndTime(showtime == null ? null : showtime.getEndTime());
        response.setSeats(booking == null
                ? List.of()
                : booking.getSeats().stream().map(this::formatSeatLabel).toList());
        response.setCreatedAt(transaction.getCreatedAt());
        response.setUpdatedAt(transaction.getUpdatedAt());
        return response;
    }

    private PaymentTransaction ensurePaymentPageUrl(PaymentTransaction transaction) {
        if (transaction.getPaymentPageUrl() != null && !transaction.getPaymentPageUrl().isBlank()) {
            return transaction;
        }
        transaction.setPaymentPageUrl(cinemaPaymentLinkService.buildPaymentPageUrl(transaction.getTxnCode()));
        transaction.setUpdatedAt(LocalDateTime.now());
        return paymentRepository.save(transaction);
    }

    private PaymentTransaction synchronizeTransactionStatus(PaymentTransaction transaction, Booking booking) {
        if (transaction.getStatus() != CinemaPaymentStatus.PENDING) {
            return transaction;
        }
        if (booking == null || booking.getPaymentStatus() == null || booking.getPaymentStatus() == CinemaPaymentStatus.PENDING) {
            return transaction;
        }
        transaction.setStatus(booking.getPaymentStatus());
        transaction.setUpdatedAt(LocalDateTime.now());
        return paymentRepository.save(transaction);
    }

    private void issueTicketsIfNeeded(Booking booking, LocalDateTime issuedAt) {
        if (!ticketRepository.findByBookingId(booking.getId()).isEmpty()) {
            return;
        }

        MovieShowtime showtime = showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        Cinema cinema = cinemaRepository.findById(booking.getCinemaId()).orElse(null);
        Auditorium auditorium = auditoriumRepository.findById(booking.getAuditoriumId()).orElse(null);
        Movie movie = (showtime != null && showtime.getMovieId() != null)
                ? movieRepository.findById(showtime.getMovieId()).orElse(null)
                : null;

        List<Ticket> tickets = booking.getSeats().stream().map(seat -> {
            Ticket ticket = new Ticket();
            ticket.setBookingId(booking.getId());
            ticket.setUserId(booking.getUserId());
            ticket.setBookingCode(booking.getBookingCode());
            ticket.setMovieId(showtime != null ? showtime.getMovieId() : null);
            ticket.setMovieTitle(resolveMovieTitle(showtime, movie));
            ticket.setShowtimeId(booking.getShowtimeId());
            ticket.setCinemaId(booking.getCinemaId());
            ticket.setCinemaName(cinema != null ? cinema.getName() : null);
            ticket.setAuditoriumId(booking.getAuditoriumId());
            ticket.setAuditoriumName(auditorium != null ? auditorium.getName() : null);
            ticket.setShowDate(showtime != null ? showtime.getShowDate() : null);
            ticket.setStartTime(showtime != null ? showtime.getStartTime() : null);
            ticket.setEndTime(showtime != null ? showtime.getEndTime() : null);
            ticket.setSeatId(seat.getSeatId());
            ticket.setSeatLabel(formatSeatLabel(seat));
            ticket.setTotalAmount(booking.getTotalPrice());
            ticket.setBookingStatus(booking.getBookingStatus());
            ticket.setTicketCode(UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            ticket.setStatus(TicketStatus.ACTIVE);
            ticket.setIssuedAt(issuedAt);
            return ticket;
        }).toList();
        ticketRepository.saveAll(tickets);
    }

    private BookingPricingBreakdown resolvePricingBreakdown(Booking booking) {
        if (booking.getPricingBreakdown() != null) {
            return booking.getPricingBreakdown();
        }
        ShowtimeViewResponse showtimeView = showtimeService.getShowtimeView(booking.getShowtimeId());
        BookingPricingBreakdown pricingBreakdown = cinemaPricingService.buildBreakdownFromBooking(showtimeView, booking.getSeats());
        booking.setPricingBreakdown(pricingBreakdown);
        return pricingBreakdown;
    }

    private String resolveMovieTitle(MovieShowtime showtime, Movie movie) {
        if (movie != null && movie.getTitle() != null && !movie.getTitle().isBlank()) {
            return movie.getTitle();
        }
        if (showtime == null || showtime.getMovieId() == null) {
            return "Unknown movie";
        }
        return DEMO_MOVIE_TITLES.getOrDefault(showtime.getMovieId(), "Unknown movie");
    }

    private String formatSeatLabel(BookingSeat seat) {
        if (seat == null) {
            return "-";
        }
        if (seat.getRow() != null && !seat.getRow().isBlank() && seat.getNumber() > 0) {
            return seat.getRow() + seat.getNumber();
        }
        return seat.getSeatId() == null ? "-" : seat.getSeatId();
    }

    private void validateBookingOwnership(User currentUser, Booking booking) {
        if (currentUser == null || booking == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to access booking payment");
        }
        boolean isOwner = currentUser.getId().equals(booking.getUserId());
        boolean isAdmin = currentUser.getRoles() != null && currentUser.getRoles().contains(Role.ROLE_ADMIN);
        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to access booking payment");
        }
    }
}
