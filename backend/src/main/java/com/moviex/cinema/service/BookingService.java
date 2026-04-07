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
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BookingService {
    private final BookingRepository bookingRepository;
    private final MovieShowtimeRepository showtimeRepository;
    private final SeatRepository seatRepository;
    private final CurrentUserService currentUserService;
    @Value("${cinema.booking.hold-minutes:10}")
    private long holdMinutes;

    public BookingService(BookingRepository bookingRepository,
                          MovieShowtimeRepository showtimeRepository,
                          SeatRepository seatRepository,
                          CurrentUserService currentUserService) {
        this.bookingRepository = bookingRepository;
        this.showtimeRepository = showtimeRepository;
        this.seatRepository = seatRepository;
        this.currentUserService = currentUserService;
    }

    public BookingResponse createBooking(CreateBookingRequest request) {
        if (request.getShowtimeId() == null || request.getShowtimeId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "showtimeId is required");
        }
        if (request.getSeatIds() == null || request.getSeatIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "seatIds are required");
        }

        User currentUser = currentUserService.getCurrentUser();
        MovieShowtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Showtime not found"));

        List<Seat> seats = seatRepository.findAllById(request.getSeatIds());
        if (seats.size() != request.getSeatIds().size()) {
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

        Set<String> blockedSeatIds = getBlockedSeatIds(showtime.getId());
        List<String> conflicting = request.getSeatIds().stream()
                .filter(blockedSeatIds::contains)
                .collect(Collectors.toList());
        if (!conflicting.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "One or more seats are already reserved or booked");
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

        Booking booking = new Booking();
        booking.setUserId(currentUser.getId());
        booking.setShowtimeId(showtime.getId());
        booking.setCinemaId(showtime.getCinemaId());
        booking.setAuditoriumId(showtime.getAuditoriumId());
        booking.setSeats(bookingSeats);
        booking.setTotalPrice(seatPrice.multiply(BigDecimal.valueOf(bookingSeats.size())));
        booking.setPaymentStatus(CinemaPaymentStatus.PENDING);
        booking.setBookingStatus(BookingStatus.PENDING);
        booking.setHoldExpiresAt(LocalDateTime.now().plusMinutes(holdMinutes));
        booking.setCreatedAt(LocalDateTime.now());
        booking.setUpdatedAt(LocalDateTime.now());

        Booking saved = bookingRepository.save(booking);
        List<String> seatIds = bookingSeats.stream().map(BookingSeat::getSeatId).collect(Collectors.toList());
        return new BookingResponse(saved.getId(), saved.getShowtimeId(), seatIds, saved.getTotalPrice(),
                saved.getPaymentStatus(), saved.getBookingStatus(), null);
    }

    public Booking getBooking(String id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
    }

    public List<Booking> listBookingsForCurrentUser() {
        User currentUser = currentUserService.getCurrentUser();
        return bookingRepository.findByUserId(currentUser.getId());
    }

    private Set<String> getBlockedSeatIds(String showtimeId) {
        LocalDateTime now = LocalDateTime.now();
        List<Booking> activeBookings = bookingRepository.findByShowtimeIdAndBookingStatusIn(
                showtimeId,
                List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED)
        );
        List<Booking> expired = new ArrayList<>();
        Set<String> blocked = new HashSet<>();

        for (Booking booking : activeBookings) {
            if (booking.getBookingStatus() == BookingStatus.PENDING) {
                if (booking.getHoldExpiresAt() == null || booking.getHoldExpiresAt().isBefore(now)) {
                    booking.setBookingStatus(BookingStatus.EXPIRED);
                    booking.setUpdatedAt(now);
                    expired.add(booking);
                    continue;
                }
            }
            booking.getSeats().forEach(seat -> blocked.add(seat.getSeatId()));
        }

        if (!expired.isEmpty()) {
            bookingRepository.saveAll(expired);
        }
        return blocked;
    }
}
