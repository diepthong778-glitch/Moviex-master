package com.moviex.cinema.service;

import com.moviex.cinema.dto.BookingResponse;
import com.moviex.cinema.dto.CreateBookingRequest;
import com.moviex.cinema.dto.ShowtimeViewResponse;
import com.moviex.cinema.model.BookingPriceLine;
import com.moviex.cinema.model.BookingPricingBreakdown;
import com.moviex.cinema.model.Booking;
import com.moviex.cinema.model.BookingSeat;
import com.moviex.cinema.model.BookingStatus;
import com.moviex.cinema.model.CinemaPaymentStatus;
import com.moviex.cinema.model.MovieShowtime;
import com.moviex.cinema.model.Seat;
import com.moviex.cinema.model.SeatStatus;
import com.moviex.cinema.model.SeatType;
import com.moviex.cinema.model.ShowtimeStatus;
import com.moviex.cinema.repository.BookingRepository;
import com.moviex.cinema.repository.MovieShowtimeRepository;
import com.moviex.cinema.repository.SeatRepository;
import com.moviex.model.User;
import com.moviex.service.CurrentUserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class BookingService {
    private final BookingRepository bookingRepository;
    private final MovieShowtimeRepository showtimeRepository;
    private final SeatRepository seatRepository;
    private final ShowtimeService showtimeService;
    private final CinemaPricingService cinemaPricingService;
    private final CurrentUserService currentUserService;
    private final SeatReservationService seatReservationService;
    @Value("${cinema.booking.hold-minutes:10}")
    private long holdMinutes;

    public BookingService(BookingRepository bookingRepository,
                          MovieShowtimeRepository showtimeRepository,
                          SeatRepository seatRepository,
                          ShowtimeService showtimeService,
                          CinemaPricingService cinemaPricingService,
                          CurrentUserService currentUserService,
                          SeatReservationService seatReservationService) {
        this.bookingRepository = bookingRepository;
        this.showtimeRepository = showtimeRepository;
        this.seatRepository = seatRepository;
        this.showtimeService = showtimeService;
        this.cinemaPricingService = cinemaPricingService;
        this.currentUserService = currentUserService;
        this.seatReservationService = seatReservationService;
    }

    public BookingPricingBreakdown quoteBooking(CreateBookingRequest request) {
        return resolveBookingDraft(request).pricingBreakdown();
    }

    public BookingResponse createBooking(CreateBookingRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        BookingDraft draft = resolveBookingDraft(request);

        LocalDateTime now = LocalDateTime.now();

        List<Booking> pendingBookings = bookingRepository.findByUserIdAndShowtimeIdAndBookingStatusOrderByCreatedAtDesc(
                currentUser.getId(),
                draft.showtime().getId(),
                BookingStatus.PENDING
        );
        for (Booking pendingBooking : pendingBookings) {
            if (!hasSameSeatSelection(pendingBooking, draft.bookingSeats())) {
                continue;
            }
            if (pendingBooking.getHoldExpiresAt() == null || !pendingBooking.getHoldExpiresAt().isAfter(now)) {
                continue;
            }
            if (!seatReservationService.hasActiveReservation(pendingBooking.getId())) {
                continue;
            }
            return toBookingResponse(pendingBooking, null);
        }

        Booking booking = new Booking();
        booking.setBookingCode(generateBookingCode());
        booking.setUserId(currentUser.getId());
        booking.setShowtimeId(draft.showtime().getId());
        booking.setCinemaId(draft.showtime().getCinemaId());
        booking.setAuditoriumId(draft.showtime().getAuditoriumId());
        booking.setSeats(draft.bookingSeats());
        booking.setTotalPrice(draft.pricingBreakdown().getTotal());
        booking.setPricingBreakdown(draft.pricingBreakdown());
        booking.setPaymentStatus(CinemaPaymentStatus.PENDING);
        booking.setBookingStatus(BookingStatus.PENDING);
        booking.setHoldExpiresAt(now.plusMinutes(holdMinutes));
        booking.setCreatedAt(now);
        booking.setUpdatedAt(now);
        Booking saved = bookingRepository.save(booking);

        try {
            seatReservationService.reserveSeatsForBooking(saved);
        } catch (RuntimeException ex) {
            bookingRepository.deleteById(saved.getId());
            throw ex;
        }

        return toBookingResponse(saved, null);
    }

    public Booking getBooking(String id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
    }

    public List<Booking> listBookingsForCurrentUser() {
        expirePendingBookings();
        User currentUser = currentUserService.getCurrentUser();
        return bookingRepository.findByUserId(currentUser.getId());
    }

    public BookingResponse releaseBooking(String bookingId) {
        User currentUser = currentUserService.getCurrentUser();
        Booking booking = bookingRepository.findByIdAndUserId(bookingId, currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (booking.getBookingStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending bookings can be released");
        }

        seatReservationService.releaseReservedSeats(booking);
        booking.setBookingStatus(BookingStatus.CANCELLED);
        booking.setPaymentStatus(CinemaPaymentStatus.CANCELLED);
        booking.setUpdatedAt(LocalDateTime.now());
        bookingRepository.save(booking);

        return toBookingResponse(booking, null);
    }

    @Scheduled(fixedDelayString = "${cinema.booking.cleanup-interval-ms:60000}")
    public void expirePendingBookingsScheduled() {
        expirePendingBookings();
    }

    public void expirePendingBookings() {
        LocalDateTime now = LocalDateTime.now();
        seatReservationService.releaseExpiredReservations();
        List<Booking> expiredBookings = bookingRepository.findByBookingStatusAndHoldExpiresAtBefore(
                BookingStatus.PENDING,
                now
        );

        if (expiredBookings.isEmpty()) {
            return;
        }

        for (Booking booking : expiredBookings) {
            seatReservationService.releaseReservedSeats(booking);
            booking.setBookingStatus(BookingStatus.EXPIRED);
            booking.setPaymentStatus(CinemaPaymentStatus.FAILED);
            booking.setUpdatedAt(now);
        }
        bookingRepository.saveAll(expiredBookings);
    }

    private BookingDraft resolveBookingDraft(CreateBookingRequest request) {
        if (request.getShowtimeId() == null || request.getShowtimeId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "showtimeId is required");
        }
        if (request.getSeatIds() == null || request.getSeatIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "seatIds are required");
        }

        expirePendingBookings();
        MovieShowtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Showtime not found"));
        if (showtime.getStatus() != ShowtimeStatus.SCHEDULED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Showtime is not available for booking");
        }

        ShowtimeViewResponse showtimeView = showtimeService.getShowtimeView(showtime.getId());

        Set<String> deduplicatedSeatIds = new LinkedHashSet<>(request.getSeatIds());
        if (deduplicatedSeatIds.size() != request.getSeatIds().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "seatIds contains duplicates");
        }

        List<String> requestedSeatIds = new ArrayList<>(deduplicatedSeatIds);
        Map<String, Seat> seatById = seatRepository.findAllById(requestedSeatIds).stream()
                .collect(Collectors.toMap(Seat::getId, Function.identity()));
        if (seatById.size() != requestedSeatIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more seats not found");
        }

        List<Seat> seats = new ArrayList<>();
        for (String seatId : requestedSeatIds) {
            Seat seat = seatById.get(seatId);
            if (seat == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more seats not found");
            }
            seats.add(seat);
        }

        Set<String> auditoriumIds = seats.stream().map(Seat::getAuditoriumId).collect(Collectors.toSet());
        if (auditoriumIds.size() != 1 || !auditoriumIds.contains(showtime.getAuditoriumId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seats must belong to the showtime auditorium");
        }

        Set<String> cinemaIds = seats.stream().map(Seat::getCinemaId).collect(Collectors.toSet());
        if (cinemaIds.size() != 1 || !cinemaIds.contains(showtime.getCinemaId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seats must belong to the showtime cinema");
        }

        boolean hasUnavailable = seats.stream().anyMatch(seat -> seat.getStatus() != SeatStatus.AVAILABLE);
        if (hasUnavailable) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "One or more seats are not available");
        }

        BookingPricingBreakdown pricingBreakdown = cinemaPricingService.buildBreakdown(showtimeView, seats);
        Map<String, BookingPriceLine> priceLineBySeatId = pricingBreakdown.getSeats().stream()
                .collect(Collectors.toMap(BookingPriceLine::getSeatId, Function.identity()));

        List<BookingSeat> bookingSeats = new ArrayList<>();
        for (Seat seat : seats) {
            BookingPriceLine priceLine = priceLineBySeatId.get(seat.getId());
            BookingSeat bookingSeat = new BookingSeat();
            bookingSeat.setSeatId(seat.getId());
            bookingSeat.setRow(seat.getRow());
            bookingSeat.setNumber(seat.getNumber());
            bookingSeat.setType(normalizeSeatType(seat.getType()));
            bookingSeat.setPrice(priceLine == null ? BigDecimal.ZERO : priceLine.getLineTotal());
            bookingSeats.add(bookingSeat);
        }

        return new BookingDraft(showtime, showtimeView, seats, bookingSeats, pricingBreakdown);
    }

    private BookingResponse toBookingResponse(Booking booking, String paymentTxnCode) {
        List<String> seatIds = booking.getSeats().stream().map(BookingSeat::getSeatId).collect(Collectors.toList());
        BookingResponse response = new BookingResponse();
        response.setBookingId(booking.getId());
        response.setShowtimeId(booking.getShowtimeId());
        response.setSeatIds(seatIds);
        response.setTotalPrice(booking.getTotalPrice());
        response.setPricingBreakdown(booking.getPricingBreakdown());
        response.setPaymentStatus(booking.getPaymentStatus());
        response.setBookingStatus(booking.getBookingStatus());
        response.setPaymentTxnCode(paymentTxnCode);
        return response;
    }

    private SeatType normalizeSeatType(SeatType type) {
        if (type == null || type == SeatType.STANDARD) {
            return SeatType.NORMAL;
        }
        return type;
    }

    private boolean hasSameSeatSelection(Booking booking, List<BookingSeat> requestedSeats) {
        if (booking == null || booking.getSeats() == null) {
            return false;
        }
        Set<String> existingSeatIds = booking.getSeats().stream()
                .map(BookingSeat::getSeatId)
                .collect(Collectors.toCollection(HashSet::new));
        Set<String> requestedSeatIds = requestedSeats.stream()
                .map(BookingSeat::getSeatId)
                .collect(Collectors.toCollection(HashSet::new));
        return existingSeatIds.equals(requestedSeatIds);
    }

    private String generateBookingCode() {
        return "BKG-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private record BookingDraft(
            MovieShowtime showtime,
            ShowtimeViewResponse showtimeView,
            List<Seat> seats,
            List<BookingSeat> bookingSeats,
            BookingPricingBreakdown pricingBreakdown
    ) {}
}
