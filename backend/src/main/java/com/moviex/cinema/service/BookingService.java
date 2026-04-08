package com.moviex.cinema.service;

import com.moviex.cinema.dto.BookingResponse;
import com.moviex.cinema.dto.CreateBookingRequest;
import com.moviex.cinema.model.Booking;
import com.moviex.cinema.model.BookingSeat;
import com.moviex.cinema.model.BookingStatus;
import com.moviex.cinema.model.CinemaPaymentStatus;
import com.moviex.cinema.model.MovieShowtime;
import com.moviex.cinema.model.Seat;
import com.moviex.cinema.model.SeatStatus;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BookingService {
    private final BookingRepository bookingRepository;
    private final MovieShowtimeRepository showtimeRepository;
    private final SeatRepository seatRepository;
    private final CurrentUserService currentUserService;
    private final SeatReservationService seatReservationService;
    @Value("${cinema.booking.hold-minutes:10}")
    private long holdMinutes;

    public BookingService(BookingRepository bookingRepository,
                          MovieShowtimeRepository showtimeRepository,
                          SeatRepository seatRepository,
                          CurrentUserService currentUserService,
                          SeatReservationService seatReservationService) {
        this.bookingRepository = bookingRepository;
        this.showtimeRepository = showtimeRepository;
        this.seatRepository = seatRepository;
        this.currentUserService = currentUserService;
        this.seatReservationService = seatReservationService;
    }

    public BookingResponse createBooking(CreateBookingRequest request) {
        if (request.getShowtimeId() == null || request.getShowtimeId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "showtimeId is required");
        }
        if (request.getSeatIds() == null || request.getSeatIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "seatIds are required");
        }

        expirePendingBookings();
        User currentUser = currentUserService.getCurrentUser();
        MovieShowtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Showtime not found"));

        Set<String> deduplicatedSeatIds = new LinkedHashSet<>(request.getSeatIds());
        if (deduplicatedSeatIds.size() != request.getSeatIds().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "seatIds contains duplicates");
        }

        List<Seat> seats = seatRepository.findAllById(deduplicatedSeatIds);
        if (seats.size() != deduplicatedSeatIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more seats not found");
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

        BigDecimal seatPrice = showtime.getBasePrice();
        List<BookingSeat> bookingSeats = new ArrayList<>();
        for (Seat seat : seats) {
            BookingSeat bookingSeat = new BookingSeat();
            bookingSeat.setSeatId(seat.getId());
            bookingSeat.setRow(seat.getRow());
            bookingSeat.setNumber(seat.getNumber());
            bookingSeat.setType(seat.getType());
            bookingSeat.setPrice(seatPrice);
            bookingSeats.add(bookingSeat);
        }

        LocalDateTime now = LocalDateTime.now();
        Booking booking = new Booking();
        booking.setBookingCode(generateBookingCode());
        booking.setUserId(currentUser.getId());
        booking.setShowtimeId(showtime.getId());
        booking.setCinemaId(showtime.getCinemaId());
        booking.setAuditoriumId(showtime.getAuditoriumId());
        booking.setSeats(bookingSeats);
        booking.setTotalPrice(seatPrice.multiply(BigDecimal.valueOf(bookingSeats.size())));
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

        List<String> seatIds = bookingSeats.stream().map(BookingSeat::getSeatId).collect(Collectors.toList());
        return new BookingResponse(saved.getId(), saved.getShowtimeId(), seatIds, saved.getTotalPrice(),
                saved.getPaymentStatus(), saved.getBookingStatus(), null);
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

        List<String> seatIds = booking.getSeats().stream().map(BookingSeat::getSeatId).collect(Collectors.toList());
        return new BookingResponse(
                booking.getId(),
                booking.getShowtimeId(),
                seatIds,
                booking.getTotalPrice(),
                booking.getPaymentStatus(),
                booking.getBookingStatus(),
                null
        );
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

    private String generateBookingCode() {
        return "BKG-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }
}
