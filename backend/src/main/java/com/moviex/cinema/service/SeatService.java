package com.moviex.cinema.service;

import com.moviex.cinema.dto.CreateSeatRequest;
import com.moviex.cinema.dto.SeatAvailabilityResponse;
import com.moviex.cinema.model.Auditorium;
import com.moviex.cinema.model.Booking;
import com.moviex.cinema.model.BookingStatus;
import com.moviex.cinema.model.MovieShowtime;
import com.moviex.cinema.model.Seat;
import com.moviex.cinema.model.SeatAvailabilityStatus;
import com.moviex.cinema.model.SeatStatus;
import com.moviex.cinema.model.SeatType;
import com.moviex.cinema.repository.AuditoriumRepository;
import com.moviex.cinema.repository.BookingRepository;
import com.moviex.cinema.repository.MovieShowtimeRepository;
import com.moviex.cinema.repository.SeatRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SeatService {
    private final SeatRepository seatRepository;
    private final AuditoriumRepository auditoriumRepository;
    private final MovieShowtimeRepository showtimeRepository;
    private final BookingRepository bookingRepository;

    public SeatService(SeatRepository seatRepository,
                       AuditoriumRepository auditoriumRepository,
                       MovieShowtimeRepository showtimeRepository,
                       BookingRepository bookingRepository) {
        this.seatRepository = seatRepository;
        this.auditoriumRepository = auditoriumRepository;
        this.showtimeRepository = showtimeRepository;
        this.bookingRepository = bookingRepository;
    }

    public Seat createSeat(CreateSeatRequest request) {
        if (request.getAuditoriumId() == null || request.getAuditoriumId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "auditoriumId is required");
        }
        if (request.getRow() == null || request.getRow().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "row is required");
        }
        if (request.getNumber() == null || request.getNumber() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "seat number must be > 0");
        }

        Auditorium auditorium = auditoriumRepository.findById(request.getAuditoriumId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Auditorium not found"));

        Seat seat = new Seat();
        seat.setCinemaId(request.getCinemaId() == null ? auditorium.getCinemaId() : request.getCinemaId());
        seat.setAuditoriumId(auditorium.getId());
        seat.setRow(request.getRow().trim().toUpperCase());
        seat.setNumber(request.getNumber());
        seat.setType(request.getType() == null ? SeatType.NORMAL : request.getType());
        seat.setStatus(request.getStatus() == null ? SeatStatus.AVAILABLE : request.getStatus());
        seat.setCreatedAt(LocalDateTime.now());
        seat.setUpdatedAt(LocalDateTime.now());
        return seatRepository.save(seat);
    }

    public List<Seat> listSeats(String auditoriumId) {
        if (auditoriumId == null || auditoriumId.trim().isEmpty()) {
            return seatRepository.findAll();
        }
        return seatRepository.findByAuditoriumId(auditoriumId);
    }

    public List<SeatAvailabilityResponse> listSeatAvailability(String showtimeId) {
        if (showtimeId == null || showtimeId.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "showtimeId is required");
        }

        MovieShowtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Showtime not found"));

        List<Seat> seats = seatRepository.findByAuditoriumId(showtime.getAuditoriumId());
        List<Booking> activeBookings = bookingRepository.findByShowtimeIdAndBookingStatusIn(
                showtimeId,
                List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED)
        );

        LocalDateTime now = LocalDateTime.now();
        Map<String, SeatAvailabilityStatus> bookedStates = new HashMap<>();
        List<Booking> expired = new ArrayList<>();

        for (Booking booking : activeBookings) {
            if (booking.getBookingStatus() == BookingStatus.PENDING) {
                if (booking.getHoldExpiresAt() == null || booking.getHoldExpiresAt().isBefore(now)) {
                    booking.setBookingStatus(BookingStatus.EXPIRED);
                    booking.setUpdatedAt(now);
                    expired.add(booking);
                    continue;
                }
            }

            SeatAvailabilityStatus status = booking.getBookingStatus() == BookingStatus.CONFIRMED
                    ? SeatAvailabilityStatus.BOOKED
                    : SeatAvailabilityStatus.RESERVED;

            booking.getSeats().forEach(seat -> {
                SeatAvailabilityStatus existing = bookedStates.get(seat.getSeatId());
                if (existing == SeatAvailabilityStatus.BOOKED) {
                    return;
                }
                bookedStates.put(seat.getSeatId(), status);
            });
        }

        if (!expired.isEmpty()) {
            bookingRepository.saveAll(expired);
        }

        return seats.stream().map(seat -> {
            SeatAvailabilityStatus status;
            if (seat.getStatus() == SeatStatus.OUT_OF_SERVICE) {
                status = SeatAvailabilityStatus.OUT_OF_SERVICE;
            } else if (seat.getStatus() == SeatStatus.RESERVED) {
                status = SeatAvailabilityStatus.RESERVED;
            } else {
                status = bookedStates.getOrDefault(seat.getId(), SeatAvailabilityStatus.AVAILABLE);
            }
            return new SeatAvailabilityResponse(seat.getId(), seat.getRow(), seat.getNumber(), seat.getType(), status);
        }).toList();
    }
}
