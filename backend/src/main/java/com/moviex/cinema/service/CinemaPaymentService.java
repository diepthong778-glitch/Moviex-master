package com.moviex.cinema.service;

import com.moviex.cinema.dto.BookingResponse;
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
            return toBookingResponse(booking, existingPending.get().getTxnCode());
        }

        PaymentTransaction txn = new PaymentTransaction();
        txn.setBookingId(booking.getId());
        txn.setAmount(booking.getTotalPrice());
        txn.setStatus(CinemaPaymentStatus.PENDING);
        txn.setTxnCode(UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        txn.setCreatedAt(LocalDateTime.now());
        txn.setUpdatedAt(LocalDateTime.now());
        paymentRepository.save(txn);

        return toBookingResponse(booking, txn.getTxnCode());
    }

    public BookingResponse confirmPayment(String txnCode, boolean success) {
        User currentUser = currentUserService.getCurrentUser();
        PaymentTransaction transaction = paymentRepository.findByTxnCode(txnCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment transaction not found"));

        if (transaction.getStatus() != CinemaPaymentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment transaction already finalized");
        }

        bookingService.expirePendingBookings();
        Booking booking = bookingRepository.findById(transaction.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        validateBookingOwnership(currentUser, booking);
        LocalDateTime now = LocalDateTime.now();

        if (!success) {
            transaction.setStatus(CinemaPaymentStatus.FAILED);
            transaction.setUpdatedAt(now);
            paymentRepository.save(transaction);

            if (booking.getBookingStatus() == BookingStatus.PENDING) {
                seatReservationService.releaseReservedSeats(booking);
                booking.setBookingStatus(BookingStatus.CANCELLED);
                booking.setPaymentStatus(CinemaPaymentStatus.FAILED);
                booking.setUpdatedAt(now);
                bookingRepository.save(booking);
            }
            return toBookingResponse(booking, transaction.getTxnCode());
        }

        if (booking.getBookingStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking is not pending");
        }

        seatReservationService.confirmReservedSeats(booking);

        transaction.setStatus(CinemaPaymentStatus.PAID);
        transaction.setUpdatedAt(now);
        paymentRepository.save(transaction);

        booking.setPaymentStatus(CinemaPaymentStatus.PAID);
        booking.setBookingStatus(BookingStatus.CONFIRMED);
        booking.setUpdatedAt(now);
        bookingRepository.save(booking);

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
            ticket.setSeatLabel(seat.getRow() + seat.getNumber());
            ticket.setTotalAmount(booking.getTotalPrice());
            ticket.setBookingStatus(booking.getBookingStatus());
            ticket.setTicketCode(UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            ticket.setStatus(TicketStatus.ACTIVE);
            ticket.setIssuedAt(now);
            return ticket;
        }).toList();
        ticketRepository.saveAll(tickets);

        return toBookingResponse(booking, transaction.getTxnCode());
    }

    private BookingResponse toBookingResponse(Booking booking, String txnCode) {
        List<String> seatIds = booking.getSeats().stream().map(BookingSeat::getSeatId).collect(Collectors.toList());
        BookingResponse response = new BookingResponse();
        response.setBookingId(booking.getId());
        response.setShowtimeId(booking.getShowtimeId());
        response.setSeatIds(seatIds);
        response.setTotalPrice(booking.getTotalPrice());
        response.setPricingBreakdown(resolvePricingBreakdown(booking));
        response.setPaymentStatus(booking.getPaymentStatus());
        response.setBookingStatus(booking.getBookingStatus());
        response.setPaymentTxnCode(txnCode);
        return response;
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
