package com.moviex.cinema.service;

import com.moviex.cinema.dto.AdminAuditoriumUpdateRequest;
import com.moviex.cinema.dto.AdminBookingStatusUpdateRequest;
import com.moviex.cinema.dto.AdminSeatLayoutGenerateRequest;
import com.moviex.cinema.dto.AdminSeatUpdateRequest;
import com.moviex.cinema.dto.AdminShowtimeUpdateRequest;
import com.moviex.cinema.dto.BookingResponse;
import com.moviex.cinema.dto.CreateAuditoriumRequest;
import com.moviex.cinema.dto.CreateCinemaRequest;
import com.moviex.cinema.dto.CreateSeatRequest;
import com.moviex.cinema.dto.CreateShowtimeRequest;
import com.moviex.cinema.dto.UpdateCinemaRequest;
import com.moviex.cinema.model.Auditorium;
import com.moviex.cinema.model.Booking;
import com.moviex.cinema.model.BookingSeat;
import com.moviex.cinema.model.BookingStatus;
import com.moviex.cinema.model.Cinema;
import com.moviex.cinema.model.CinemaPaymentStatus;
import com.moviex.cinema.model.MovieShowtime;
import com.moviex.cinema.model.PaymentTransaction;
import com.moviex.cinema.model.Seat;
import com.moviex.cinema.model.SeatReservation;
import com.moviex.cinema.model.SeatStatus;
import com.moviex.cinema.model.SeatType;
import com.moviex.cinema.model.ShowtimeStatus;
import com.moviex.cinema.repository.AuditoriumRepository;
import com.moviex.cinema.repository.BookingRepository;
import com.moviex.cinema.repository.CinemaPaymentTransactionRepository;
import com.moviex.cinema.repository.CinemaRepository;
import com.moviex.cinema.repository.MovieShowtimeRepository;
import com.moviex.cinema.repository.SeatRepository;
import com.moviex.cinema.repository.SeatReservationRepository;
import com.moviex.cinema.repository.TicketRepository;
import com.moviex.model.Movie;
import com.moviex.model.Role;
import com.moviex.model.User;
import com.moviex.repository.MovieRepository;
import com.moviex.repository.UserRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AdminCinemaService {
    private final CinemaRepository cinemaRepository;
    private final AuditoriumRepository auditoriumRepository;
    private final SeatRepository seatRepository;
    private final MovieShowtimeRepository showtimeRepository;
    private final BookingRepository bookingRepository;
    private final CinemaPaymentTransactionRepository paymentTransactionRepository;
    private final SeatReservationRepository seatReservationRepository;
    private final TicketRepository ticketRepository;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;
    private final CinemaService cinemaService;
    private final AuditoriumService auditoriumService;
    private final SeatService seatService;
    private final ShowtimeService showtimeService;
    private final SeatReservationService seatReservationService;
    private final CinemaPaymentService cinemaPaymentService;

    public AdminCinemaService(CinemaRepository cinemaRepository,
                              AuditoriumRepository auditoriumRepository,
                              SeatRepository seatRepository,
                              MovieShowtimeRepository showtimeRepository,
                              BookingRepository bookingRepository,
                              CinemaPaymentTransactionRepository paymentTransactionRepository,
                              SeatReservationRepository seatReservationRepository,
                              TicketRepository ticketRepository,
                              MovieRepository movieRepository,
                              UserRepository userRepository,
                              CinemaService cinemaService,
                              AuditoriumService auditoriumService,
                              SeatService seatService,
                              ShowtimeService showtimeService,
                              SeatReservationService seatReservationService,
                              CinemaPaymentService cinemaPaymentService) {
        this.cinemaRepository = cinemaRepository;
        this.auditoriumRepository = auditoriumRepository;
        this.seatRepository = seatRepository;
        this.showtimeRepository = showtimeRepository;
        this.bookingRepository = bookingRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.seatReservationRepository = seatReservationRepository;
        this.ticketRepository = ticketRepository;
        this.movieRepository = movieRepository;
        this.userRepository = userRepository;
        this.cinemaService = cinemaService;
        this.auditoriumService = auditoriumService;
        this.seatService = seatService;
        this.showtimeService = showtimeService;
        this.seatReservationService = seatReservationService;
        this.cinemaPaymentService = cinemaPaymentService;
    }

    public Map<String, Object> getDashboardStats() {
        List<Booking> bookings = bookingRepository.findAll();
        List<PaymentTransaction> payments = paymentTransactionRepository.findAll();

        Map<BookingStatus, Long> bookingCounts = bookings.stream()
                .collect(Collectors.groupingBy(Booking::getBookingStatus, Collectors.counting()));
        Map<CinemaPaymentStatus, Long> paymentCounts = payments.stream()
                .collect(Collectors.groupingBy(PaymentTransaction::getStatus, Collectors.counting()));

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("cinemaBranches", cinemaRepository.count());
        stats.put("activeCinemaBranches", cinemaRepository.findByActiveTrue().size());
        stats.put("auditoriums", auditoriumRepository.count());
        stats.put("activeAuditoriums", auditoriumRepository.findAll().stream().filter(Auditorium::isActive).count());
        stats.put("seats", seatRepository.count());
        stats.put("showtimes", showtimeRepository.count());
        stats.put("activeShowtimes", showtimeRepository.findAll().stream()
                .filter(showtime -> showtime.getStatus() == ShowtimeStatus.SCHEDULED).count());
        stats.put("bookingsTotal", bookings.size());
        stats.put("bookingPending", bookingCounts.getOrDefault(BookingStatus.PENDING, 0L));
        stats.put("bookingConfirmed", bookingCounts.getOrDefault(BookingStatus.CONFIRMED, 0L));
        stats.put("bookingCancelled", bookingCounts.getOrDefault(BookingStatus.CANCELLED, 0L));
        stats.put("bookingExpired", bookingCounts.getOrDefault(BookingStatus.EXPIRED, 0L));
        stats.put("paymentsTotal", payments.size());
        stats.put("paymentPending", paymentCounts.getOrDefault(CinemaPaymentStatus.PENDING, 0L));
        stats.put("paymentPaid", paymentCounts.getOrDefault(CinemaPaymentStatus.PAID, 0L));
        stats.put("paymentFailed", paymentCounts.getOrDefault(CinemaPaymentStatus.FAILED, 0L));
        stats.put("paymentCancelled", paymentCounts.getOrDefault(CinemaPaymentStatus.CANCELLED, 0L));
        stats.put("usersTotal", userRepository.count());
        stats.put("ticketsTotal", ticketRepository.count());
        return stats;
    }

    public Map<String, Object> getReferenceData() {
        Map<String, Object> reference = new LinkedHashMap<>();
        reference.put("movies", movieRepository.findAll().stream()
                .map(movie -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", movie.getId());
                    row.put("title", movie.getTitle());
                    return row;
                }).toList());
        reference.put("cinemas", cinemaRepository.findAll().stream()
                .map(cinema -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", cinema.getId());
                    row.put("name", cinema.getName());
                    row.put("active", cinema.isActive());
                    return row;
                }).toList());
        reference.put("auditoriums", auditoriumRepository.findAll().stream()
                .map(auditorium -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", auditorium.getId());
                    row.put("cinemaId", auditorium.getCinemaId());
                    row.put("name", auditorium.getName());
                    row.put("active", auditorium.isActive());
                    return row;
                }).toList());
        return reference;
    }

    public List<Cinema> listBranches() {
        return cinemaRepository.findAll().stream()
                .sorted(Comparator.comparing(Cinema::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();
    }

    public Cinema createBranch(CreateCinemaRequest request) {
        return cinemaService.createCinema(request);
    }

    public Cinema updateBranch(String branchId, UpdateCinemaRequest request) {
        return cinemaService.updateCinema(branchId, request);
    }

    public Cinema setBranchActive(String branchId, boolean active) {
        Cinema cinema = cinemaService.getCinema(branchId);
        cinema.setActive(active);
        cinema.setUpdatedAt(LocalDateTime.now());
        return cinemaRepository.save(cinema);
    }

    public void deleteBranch(String branchId) {
        if (!auditoriumRepository.findByCinemaId(branchId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete cinema with existing auditoriums");
        }
        if (!showtimeRepository.findByCinemaId(branchId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete cinema with existing showtimes");
        }
        cinemaRepository.deleteById(branchId);
    }

    public List<Auditorium> listAuditoriums(String cinemaId) {
        if (isBlank(cinemaId)) {
            return auditoriumRepository.findAll();
        }
        return auditoriumRepository.findByCinemaId(cinemaId);
    }

    public Auditorium createAuditorium(CreateAuditoriumRequest request) {
        return auditoriumService.createAuditorium(request);
    }

    public Auditorium updateAuditorium(String auditoriumId, AdminAuditoriumUpdateRequest request) {
        Auditorium auditorium = auditoriumRepository.findById(auditoriumId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Auditorium not found"));

        if (!isBlank(request.getCinemaId())) {
            cinemaRepository.findById(request.getCinemaId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cinema not found"));
            auditorium.setCinemaId(request.getCinemaId());
        }
        if (!isBlank(request.getName())) {
            auditorium.setName(request.getName().trim());
        }
        if (request.getCapacity() != null) {
            auditorium.setCapacity(Math.max(0, request.getCapacity()));
        }
        if (request.getActive() != null) {
            auditorium.setActive(request.getActive());
        }
        auditorium.setUpdatedAt(LocalDateTime.now());
        return auditoriumRepository.save(auditorium);
    }

    public Auditorium setAuditoriumActive(String auditoriumId, boolean active) {
        Auditorium auditorium = auditoriumRepository.findById(auditoriumId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Auditorium not found"));
        auditorium.setActive(active);
        auditorium.setUpdatedAt(LocalDateTime.now());
        return auditoriumRepository.save(auditorium);
    }

    public void deleteAuditorium(String auditoriumId) {
        if (!seatRepository.findByAuditoriumId(auditoriumId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete auditorium with existing seats");
        }
        if (!showtimeRepository.findByAuditoriumId(auditoriumId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete auditorium with existing showtimes");
        }
        auditoriumRepository.deleteById(auditoriumId);
    }

    public List<Seat> listSeats(String auditoriumId) {
        if (isBlank(auditoriumId)) {
            return seatRepository.findAll();
        }
        return seatRepository.findByAuditoriumId(auditoriumId);
    }

    public Seat createSeat(CreateSeatRequest request) {
        return seatService.createSeat(request);
    }

    public Seat updateSeat(String seatId, AdminSeatUpdateRequest request) {
        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Seat not found"));

        if (!isBlank(request.getCinemaId())) {
            seat.setCinemaId(request.getCinemaId());
        }
        if (!isBlank(request.getAuditoriumId())) {
            auditoriumRepository.findById(request.getAuditoriumId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Auditorium not found"));
            seat.setAuditoriumId(request.getAuditoriumId());
        }
        if (!isBlank(request.getRow())) {
            seat.setRow(request.getRow().trim().toUpperCase());
        }
        if (request.getNumber() != null) {
            if (request.getNumber() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seat number must be greater than 0");
            }
            seat.setNumber(request.getNumber());
        }
        if (request.getType() != null) {
            seat.setType(request.getType());
        }
        if (request.getStatus() != null) {
            seat.setStatus(request.getStatus());
        }
        seat.setUpdatedAt(LocalDateTime.now());
        try {
            return seatRepository.save(seat);
        } catch (DuplicateKeyException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate row/seat number in the same auditorium");
        }
    }

    public Map<String, Object> generateSeatLayout(String auditoriumId, AdminSeatLayoutGenerateRequest request) {
        Auditorium auditorium = auditoriumRepository.findById(auditoriumId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Auditorium not found"));

        String normalizedRows = normalizeRows(request.getRows());
        int seatsPerRow = request.getSeatsPerRow() == null ? 12 : Math.max(1, request.getSeatsPerRow());
        Set<String> vipRows = toRowSet(request.getVipRows());
        Set<String> coupleRows = toRowSet(request.getCoupleRows());

        List<Seat> existingSeats = seatRepository.findByAuditoriumId(auditoriumId);
        Set<String> existingKeys = existingSeats.stream()
                .map(seat -> seat.getRow() + "-" + seat.getNumber())
                .collect(Collectors.toSet());

        List<Seat> toCreate = new ArrayList<>();
        for (char row : normalizedRows.toCharArray()) {
            String rowLabel = String.valueOf(row);
            for (int number = 1; number <= seatsPerRow; number++) {
                String key = rowLabel + "-" + number;
                if (existingKeys.contains(key)) {
                    continue;
                }
                Seat seat = new Seat();
                seat.setCinemaId(auditorium.getCinemaId());
                seat.setAuditoriumId(auditoriumId);
                seat.setRow(rowLabel);
                seat.setNumber(number);
                seat.setType(resolveSeatType(rowLabel, vipRows, coupleRows));
                seat.setStatus(SeatStatus.AVAILABLE);
                seat.setCreatedAt(LocalDateTime.now());
                seat.setUpdatedAt(LocalDateTime.now());
                toCreate.add(seat);
            }
        }

        if (!toCreate.isEmpty()) {
            seatRepository.saveAll(toCreate);
        }

        return Map.of(
                "createdCount", toCreate.size(),
                "totalSeats", seatRepository.findByAuditoriumId(auditoriumId).size()
        );
    }

    public void deleteSeat(String seatId) {
        if (seatReservationRepository.existsBySeatId(seatId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete seat that is reserved/booked");
        }
        if (!bookingRepository.findBySeatsSeatId(seatId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete seat used by booking history");
        }
        seatRepository.deleteById(seatId);
    }

    public List<MovieShowtime> listShowtimes(String cinemaId, java.time.LocalDate showDate) {
        return showtimeService.listShowtimes(cinemaId, showDate);
    }

    public MovieShowtime createShowtime(CreateShowtimeRequest request) {
        return showtimeService.createShowtime(request);
    }

    public MovieShowtime updateShowtime(String showtimeId, AdminShowtimeUpdateRequest request) {
        MovieShowtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Showtime not found"));

        if (!isBlank(request.getMovieId())) {
            movieRepository.findById(request.getMovieId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Movie not found"));
            showtime.setMovieId(request.getMovieId());
        }
        if (!isBlank(request.getCinemaId())) {
            cinemaRepository.findById(request.getCinemaId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cinema not found"));
            showtime.setCinemaId(request.getCinemaId());
        }
        if (!isBlank(request.getAuditoriumId())) {
            auditoriumRepository.findById(request.getAuditoriumId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Auditorium not found"));
            showtime.setAuditoriumId(request.getAuditoriumId());
        }
        if (request.getShowDate() != null) {
            showtime.setShowDate(request.getShowDate());
        }
        if (request.getStartTime() != null) {
            showtime.setStartTime(request.getStartTime());
        }
        if (request.getEndTime() != null) {
            showtime.setEndTime(request.getEndTime());
        }
        if (request.getBasePrice() != null) {
            showtime.setBasePrice(request.getBasePrice());
        }
        if (request.getStatus() != null) {
            showtime.setStatus(request.getStatus());
        }
        showtime.setUpdatedAt(LocalDateTime.now());
        return showtimeRepository.save(showtime);
    }

    public MovieShowtime setShowtimeActive(String showtimeId, boolean active) {
        MovieShowtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Showtime not found"));
        showtime.setStatus(active ? ShowtimeStatus.SCHEDULED : ShowtimeStatus.CANCELLED);
        showtime.setUpdatedAt(LocalDateTime.now());
        return showtimeRepository.save(showtime);
    }

    public void deleteShowtime(String showtimeId) {
        if (!bookingRepository.findByShowtimeId(showtimeId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete showtime with booking history");
        }
        showtimeRepository.deleteById(showtimeId);
    }

    public List<Map<String, Object>> listBookings(Integer limit) {
        int resolvedLimit = limit == null ? 200 : Math.max(1, Math.min(limit, 1000));
        return bookingRepository.findAllByOrderByCreatedAtDesc().stream()
                .limit(resolvedLimit)
                .map(this::toBookingRow)
                .toList();
    }

    public Map<String, Object> updateBookingStatus(String bookingId, AdminBookingStatusUpdateRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (request.getBookingStatus() != null && request.getBookingStatus() != booking.getBookingStatus()) {
            switch (request.getBookingStatus()) {
                case CONFIRMED -> confirmBookingFromPending(booking);
                case CANCELLED -> cancelBookingFromPending(booking);
                case EXPIRED -> expireBookingFromPending(booking);
                case PENDING -> throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot force booking back to PENDING");
            }
        }

        if (request.getPaymentStatus() != null) {
            booking.setPaymentStatus(request.getPaymentStatus());
        }
        booking.setUpdatedAt(LocalDateTime.now());
        bookingRepository.save(booking);
        return toBookingRow(booking);
    }

    public List<Map<String, Object>> listCinemaUsers() {
        List<Booking> bookings = bookingRepository.findAll();
        Map<String, Long> bookingCountByUser = bookings.stream()
                .collect(Collectors.groupingBy(Booking::getUserId, Collectors.counting()));
        Map<String, Long> ticketCountByUser = ticketRepository.findAll().stream()
                .collect(Collectors.groupingBy(com.moviex.cinema.model.Ticket::getUserId, Collectors.counting()));

        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getEmail, Comparator.nullsLast(String::compareToIgnoreCase)))
                .map(user -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", user.getId());
                    row.put("email", user.getEmail());
                    row.put("roles", toRoleString(user.getRoles()));
                    row.put("subscriptionPlan", user.getSubscriptionPlan() == null ? "NONE" : user.getSubscriptionPlan().name());
                    row.put("bookingCount", bookingCountByUser.getOrDefault(user.getId(), 0L));
                    row.put("ticketCount", ticketCountByUser.getOrDefault(user.getId(), 0L));
                    row.put("online", user.isOnline());
                    row.put("lastLoginAt", user.getLastLoginAt());
                    return row;
                })
                .toList();
    }

    public List<Map<String, Object>> listPaymentTransactions(Integer limit) {
        int resolvedLimit = limit == null ? 200 : Math.max(1, Math.min(limit, 1000));
        return paymentTransactionRepository.findAllByOrderByCreatedAtDesc().stream()
                .limit(resolvedLimit)
                .map(this::toPaymentRow)
                .toList();
    }

    public Map<String, Object> simulatePaymentDecision(String txnCode, boolean success) {
        BookingResponse bookingResponse = cinemaPaymentService.confirmPayment(txnCode, success);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("txnCode", txnCode);
        response.put("success", success);
        response.put("booking", bookingResponse);
        return response;
    }

    private void confirmBookingFromPending(Booking booking) {
        if (booking.getBookingStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending bookings can be confirmed manually");
        }
        seatReservationService.confirmReservedSeats(booking);
        booking.setBookingStatus(BookingStatus.CONFIRMED);
        if (booking.getPaymentStatus() == CinemaPaymentStatus.PENDING) {
            booking.setPaymentStatus(CinemaPaymentStatus.PAID);
        }
    }

    private void cancelBookingFromPending(Booking booking) {
        if (booking.getBookingStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending bookings can be cancelled manually");
        }
        seatReservationService.releaseReservedSeats(booking);
        booking.setBookingStatus(BookingStatus.CANCELLED);
        if (booking.getPaymentStatus() == CinemaPaymentStatus.PENDING) {
            booking.setPaymentStatus(CinemaPaymentStatus.CANCELLED);
        }
    }

    private void expireBookingFromPending(Booking booking) {
        if (booking.getBookingStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending bookings can be expired manually");
        }
        seatReservationService.releaseReservedSeats(booking);
        booking.setBookingStatus(BookingStatus.EXPIRED);
        if (booking.getPaymentStatus() == CinemaPaymentStatus.PENDING) {
            booking.setPaymentStatus(CinemaPaymentStatus.FAILED);
        }
    }

    private Map<String, Object> toBookingRow(Booking booking) {
        Map<String, Object> row = new LinkedHashMap<>();
        User user = userRepository.findById(booking.getUserId()).orElse(null);
        MovieShowtime showtime = booking.getShowtimeId() == null ? null : showtimeRepository.findById(booking.getShowtimeId()).orElse(null);
        Cinema cinema = booking.getCinemaId() == null ? null : cinemaRepository.findById(booking.getCinemaId()).orElse(null);
        Auditorium auditorium = booking.getAuditoriumId() == null ? null : auditoriumRepository.findById(booking.getAuditoriumId()).orElse(null);
        Movie movie = showtime == null ? null : movieRepository.findById(showtime.getMovieId()).orElse(null);

        Map<String, String> reservationBySeatId = seatReservationRepository.findByBookingId(booking.getId()).stream()
                .collect(Collectors.toMap(SeatReservation::getSeatId, reservation -> reservation.getState().name(), (left, right) -> left));

        List<Map<String, Object>> seatDetails = booking.getSeats().stream()
                .map(seat -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("seatId", seat.getSeatId());
                    item.put("label", formatSeatLabel(seat));
                    item.put("state", reservationBySeatId.getOrDefault(seat.getSeatId(), "AVAILABLE"));
                    return item;
                })
                .toList();

        row.put("bookingId", booking.getId());
        row.put("bookingCode", booking.getBookingCode());
        row.put("userId", booking.getUserId());
        row.put("userEmail", user == null ? null : user.getEmail());
        row.put("movieId", showtime == null ? null : showtime.getMovieId());
        row.put("movieTitle", movie == null ? null : movie.getTitle());
        row.put("cinemaId", booking.getCinemaId());
        row.put("cinemaName", cinema == null ? null : cinema.getName());
        row.put("auditoriumId", booking.getAuditoriumId());
        row.put("auditoriumName", auditorium == null ? null : auditorium.getName());
        row.put("showDate", showtime == null ? null : showtime.getShowDate());
        row.put("startTime", showtime == null ? null : showtime.getStartTime());
        row.put("seats", booking.getSeats().stream().map(this::formatSeatLabel).toList());
        row.put("seatDetails", seatDetails);
        row.put("totalPrice", booking.getTotalPrice());
        row.put("paymentStatus", booking.getPaymentStatus());
        row.put("bookingStatus", booking.getBookingStatus());
        row.put("createdAt", booking.getCreatedAt());
        row.put("updatedAt", booking.getUpdatedAt());
        return row;
    }

    private Map<String, Object> toPaymentRow(PaymentTransaction transaction) {
        Map<String, Object> row = new LinkedHashMap<>();
        Booking booking = transaction.getBookingId() == null
                ? null
                : bookingRepository.findById(transaction.getBookingId()).orElse(null);
        User user = booking == null ? null : userRepository.findById(booking.getUserId()).orElse(null);

        row.put("id", transaction.getId());
        row.put("txnCode", transaction.getTxnCode());
        row.put("bookingId", transaction.getBookingId());
        row.put("bookingCode", booking == null ? null : booking.getBookingCode());
        row.put("userEmail", user == null ? null : user.getEmail());
        row.put("amount", transaction.getAmount());
        row.put("status", transaction.getStatus());
        row.put("provider", transaction.getProvider());
        row.put("createdAt", transaction.getCreatedAt());
        row.put("updatedAt", transaction.getUpdatedAt());
        return row;
    }

    private String toRoleString(Set<Role> roles) {
        if (roles == null || roles.isEmpty()) {
            return "ROLE_USER";
        }
        return roles.stream().map(Enum::name).sorted().collect(Collectors.joining(","));
    }

    private String formatSeatLabel(BookingSeat seat) {
        if (seat == null) {
            return "-";
        }
        if (!isBlank(seat.getRow()) && seat.getNumber() > 0) {
            return seat.getRow() + seat.getNumber();
        }
        return seat.getSeatId() == null ? "-" : seat.getSeatId();
    }

    private String normalizeRows(String rows) {
        String value = isBlank(rows) ? "ABCDEFGH" : rows.toUpperCase();
        StringBuilder builder = new StringBuilder();
        for (char c : value.toCharArray()) {
            if (c >= 'A' && c <= 'Z') {
                builder.append(c);
            }
        }
        if (builder.isEmpty()) {
            return "ABCDEFGH";
        }
        return builder.toString();
    }

    private Set<String> toRowSet(String rows) {
        if (isBlank(rows)) {
            return Set.of();
        }
        return normalizeRows(rows).chars()
                .mapToObj(ch -> String.valueOf((char) ch))
                .collect(Collectors.toSet());
    }

    private SeatType resolveSeatType(String rowLabel, Set<String> vipRows, Set<String> coupleRows) {
        if (coupleRows.contains(rowLabel)) {
            return SeatType.COUPLE;
        }
        if (vipRows.contains(rowLabel)) {
            return SeatType.VIP;
        }
        return SeatType.NORMAL;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
