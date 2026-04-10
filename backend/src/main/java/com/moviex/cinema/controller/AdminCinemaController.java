package com.moviex.cinema.controller;

import com.moviex.cinema.dto.AdminAuditoriumUpdateRequest;
import com.moviex.cinema.dto.AdminBookingStatusUpdateRequest;
import com.moviex.cinema.dto.AdminSeatLayoutGenerateRequest;
import com.moviex.cinema.dto.AdminSeatUpdateRequest;
import com.moviex.cinema.dto.AdminShowtimeUpdateRequest;
import com.moviex.cinema.dto.CreateAuditoriumRequest;
import com.moviex.cinema.dto.CreateCinemaRequest;
import com.moviex.cinema.dto.CreateSeatRequest;
import com.moviex.cinema.dto.CreateShowtimeRequest;
import com.moviex.cinema.dto.UpdateCinemaRequest;
import com.moviex.cinema.model.Auditorium;
import com.moviex.cinema.model.BookingStatus;
import com.moviex.cinema.model.Cinema;
import com.moviex.cinema.model.CinemaPaymentStatus;
import com.moviex.cinema.model.MovieShowtime;
import com.moviex.cinema.model.Seat;
import com.moviex.cinema.service.AdminCinemaService;
import com.moviex.cinema.service.CinemaRevenueAnalyticsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/cinema")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCinemaController {
    private final AdminCinemaService adminCinemaService;
    private final CinemaRevenueAnalyticsService cinemaRevenueAnalyticsService;

    public AdminCinemaController(AdminCinemaService adminCinemaService,
                                 CinemaRevenueAnalyticsService cinemaRevenueAnalyticsService) {
        this.adminCinemaService = adminCinemaService;
        this.cinemaRevenueAnalyticsService = cinemaRevenueAnalyticsService;
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(adminCinemaService.getDashboardStats());
    }

    @GetMapping("/reference")
    public ResponseEntity<Map<String, Object>> getReferenceData() {
        return ResponseEntity.ok(adminCinemaService.getReferenceData());
    }

    @GetMapping("/branches")
    public ResponseEntity<List<Cinema>> listBranches() {
        return ResponseEntity.ok(adminCinemaService.listBranches());
    }

    @PostMapping("/branches")
    public ResponseEntity<Cinema> createBranch(@RequestBody CreateCinemaRequest request) {
        return ResponseEntity.ok(adminCinemaService.createBranch(request));
    }

    @PutMapping("/branches/{branchId}")
    public ResponseEntity<Cinema> updateBranch(@PathVariable String branchId, @RequestBody UpdateCinemaRequest request) {
        return ResponseEntity.ok(adminCinemaService.updateBranch(branchId, request));
    }

    @PatchMapping("/branches/{branchId}/active")
    public ResponseEntity<Cinema> setBranchActive(@PathVariable String branchId, @RequestParam boolean active) {
        return ResponseEntity.ok(adminCinemaService.setBranchActive(branchId, active));
    }

    @DeleteMapping("/branches/{branchId}")
    public ResponseEntity<Void> deleteBranch(@PathVariable String branchId) {
        adminCinemaService.deleteBranch(branchId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/auditoriums")
    public ResponseEntity<List<Auditorium>> listAuditoriums(@RequestParam(required = false) String cinemaId) {
        return ResponseEntity.ok(adminCinemaService.listAuditoriums(cinemaId));
    }

    @PostMapping("/auditoriums")
    public ResponseEntity<Auditorium> createAuditorium(@RequestBody CreateAuditoriumRequest request) {
        return ResponseEntity.ok(adminCinemaService.createAuditorium(request));
    }

    @PutMapping("/auditoriums/{auditoriumId}")
    public ResponseEntity<Auditorium> updateAuditorium(@PathVariable String auditoriumId,
                                                       @RequestBody AdminAuditoriumUpdateRequest request) {
        return ResponseEntity.ok(adminCinemaService.updateAuditorium(auditoriumId, request));
    }

    @PatchMapping("/auditoriums/{auditoriumId}/active")
    public ResponseEntity<Auditorium> setAuditoriumActive(@PathVariable String auditoriumId, @RequestParam boolean active) {
        return ResponseEntity.ok(adminCinemaService.setAuditoriumActive(auditoriumId, active));
    }

    @DeleteMapping("/auditoriums/{auditoriumId}")
    public ResponseEntity<Void> deleteAuditorium(@PathVariable String auditoriumId) {
        adminCinemaService.deleteAuditorium(auditoriumId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/seats")
    public ResponseEntity<List<Seat>> listSeats(@RequestParam(required = false) String auditoriumId) {
        return ResponseEntity.ok(adminCinemaService.listSeats(auditoriumId));
    }

    @PostMapping("/seats")
    public ResponseEntity<Seat> createSeat(@RequestBody CreateSeatRequest request) {
        return ResponseEntity.ok(adminCinemaService.createSeat(request));
    }

    @PutMapping("/seats/{seatId}")
    public ResponseEntity<Seat> updateSeat(@PathVariable String seatId, @RequestBody AdminSeatUpdateRequest request) {
        return ResponseEntity.ok(adminCinemaService.updateSeat(seatId, request));
    }

    @PostMapping("/auditoriums/{auditoriumId}/layout")
    public ResponseEntity<Map<String, Object>> generateSeatLayout(@PathVariable String auditoriumId,
                                                                  @RequestBody AdminSeatLayoutGenerateRequest request) {
        return ResponseEntity.ok(adminCinemaService.generateSeatLayout(auditoriumId, request));
    }

    @DeleteMapping("/seats/{seatId}")
    public ResponseEntity<Void> deleteSeat(@PathVariable String seatId) {
        adminCinemaService.deleteSeat(seatId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/showtimes")
    public ResponseEntity<List<MovieShowtime>> listShowtimes(
            @RequestParam(required = false) String cinemaId,
            @RequestParam(required = false) String movieId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate showDate) {
        return ResponseEntity.ok(adminCinemaService.listShowtimes(cinemaId, movieId, showDate));
    }

    @PostMapping("/showtimes")
    public ResponseEntity<MovieShowtime> createShowtime(@RequestBody CreateShowtimeRequest request) {
        return ResponseEntity.ok(adminCinemaService.createShowtime(request));
    }

    @PutMapping("/showtimes/{showtimeId}")
    public ResponseEntity<MovieShowtime> updateShowtime(@PathVariable String showtimeId,
                                                        @RequestBody AdminShowtimeUpdateRequest request) {
        return ResponseEntity.ok(adminCinemaService.updateShowtime(showtimeId, request));
    }

    @PatchMapping("/showtimes/{showtimeId}/active")
    public ResponseEntity<MovieShowtime> setShowtimeActive(@PathVariable String showtimeId, @RequestParam boolean active) {
        return ResponseEntity.ok(adminCinemaService.setShowtimeActive(showtimeId, active));
    }

    @DeleteMapping("/showtimes/{showtimeId}")
    public ResponseEntity<Void> deleteShowtime(@PathVariable String showtimeId) {
        adminCinemaService.deleteShowtime(showtimeId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/bookings")
    public ResponseEntity<List<Map<String, Object>>> listBookings(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String movieId,
            @RequestParam(required = false) String cinemaId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate showDate,
            @RequestParam(required = false) BookingStatus bookingStatus,
            @RequestParam(required = false) CinemaPaymentStatus paymentStatus) {
        return ResponseEntity.ok(adminCinemaService.listBookings(
                limit,
                movieId,
                cinemaId,
                showDate,
                bookingStatus,
                paymentStatus
        ));
    }

    @PatchMapping("/bookings/{bookingId}/status")
    public ResponseEntity<Map<String, Object>> updateBookingStatus(@PathVariable String bookingId,
                                                                   @RequestBody AdminBookingStatusUpdateRequest request) {
        return ResponseEntity.ok(adminCinemaService.updateBookingStatus(bookingId, request));
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> listCinemaUsers() {
        return ResponseEntity.ok(adminCinemaService.listCinemaUsers());
    }

    @GetMapping("/payments")
    public ResponseEntity<List<Map<String, Object>>> listPaymentTransactions(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String movieId,
            @RequestParam(required = false) String cinemaId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate showDate,
            @RequestParam(required = false) CinemaPaymentStatus paymentStatus) {
        return ResponseEntity.ok(adminCinemaService.listPaymentTransactions(
                limit,
                movieId,
                cinemaId,
                showDate,
                paymentStatus
        ));
    }

    @GetMapping("/tickets")
    public ResponseEntity<List<Map<String, Object>>> listTickets(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String movieId,
            @RequestParam(required = false) String cinemaId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate showDate,
            @RequestParam(required = false) BookingStatus bookingStatus,
            @RequestParam(required = false) CinemaPaymentStatus paymentStatus) {
        return ResponseEntity.ok(adminCinemaService.listTickets(
                limit,
                movieId,
                cinemaId,
                showDate,
                bookingStatus,
                paymentStatus
        ));
    }

    @GetMapping("/showtimes/{showtimeId}/seats")
    public ResponseEntity<Map<String, Object>> inspectShowtimeSeats(@PathVariable String showtimeId) {
        return ResponseEntity.ok(adminCinemaService.getShowtimeSeatInspection(showtimeId));
    }

    @PostMapping("/payments/{txnCode}/simulate")
    public ResponseEntity<Map<String, Object>> simulatePaymentDecision(@PathVariable String txnCode,
                                                                       @RequestParam(defaultValue = "true") boolean success) {
        return ResponseEntity.ok(adminCinemaService.simulatePaymentDecision(txnCode, success));
    }

    @GetMapping("/revenue/daily")
    public ResponseEntity<Map<String, Object>> getDailyRevenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(cinemaRevenueAnalyticsService.getDailyRevenue(date));
    }

    @GetMapping("/revenue/weekly")
    public ResponseEntity<Map<String, Object>> getWeeklyRevenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(cinemaRevenueAnalyticsService.getWeeklyRevenue(date));
    }

    @GetMapping("/revenue/monthly")
    public ResponseEntity<Map<String, Object>> getMonthlyRevenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(cinemaRevenueAnalyticsService.getMonthlyRevenue(date));
    }

    @GetMapping("/revenue/by-cinema")
    public ResponseEntity<Map<String, Object>> getRevenueByCinema(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(cinemaRevenueAnalyticsService.getRevenueByCinema(fromDate, toDate));
    }

    @GetMapping("/revenue/by-movie")
    public ResponseEntity<Map<String, Object>> getRevenueByMovie(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(cinemaRevenueAnalyticsService.getRevenueByMovie(fromDate, toDate));
    }

    @GetMapping("/revenue/by-showtime")
    public ResponseEntity<Map<String, Object>> getRevenueByShowtime(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(cinemaRevenueAnalyticsService.getRevenueByShowtime(fromDate, toDate));
    }
}
