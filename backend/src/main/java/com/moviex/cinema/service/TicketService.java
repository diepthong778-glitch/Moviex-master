package com.moviex.cinema.service;

import com.moviex.cinema.dto.CinemaTicketViewResponse;
import com.moviex.cinema.dto.TicketScanRequest;
import com.moviex.cinema.dto.TicketScanResponse;
import com.moviex.cinema.model.Auditorium;
import com.moviex.cinema.model.Booking;
import com.moviex.cinema.model.BookingSeat;
import com.moviex.cinema.model.BookingStatus;
import com.moviex.cinema.model.CinemaPaymentStatus;
import com.moviex.cinema.model.Cinema;
import com.moviex.cinema.model.MovieShowtime;
import com.moviex.cinema.model.Ticket;
import com.moviex.cinema.model.TicketStatus;
import com.moviex.cinema.repository.AuditoriumRepository;
import com.moviex.cinema.repository.BookingRepository;
import com.moviex.cinema.repository.CinemaRepository;
import com.moviex.cinema.repository.MovieShowtimeRepository;
import com.moviex.cinema.repository.TicketRepository;
import com.moviex.model.Movie;
import com.moviex.model.User;
import com.moviex.repository.MovieRepository;
import com.moviex.repository.UserRepository;
import com.moviex.service.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class TicketService {
    private final TicketRepository ticketRepository;
    private final BookingRepository bookingRepository;
    private final MovieShowtimeRepository showtimeRepository;
    private final CinemaRepository cinemaRepository;
    private final AuditoriumRepository auditoriumRepository;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    public TicketService(TicketRepository ticketRepository,
                         BookingRepository bookingRepository,
                         MovieShowtimeRepository showtimeRepository,
                         CinemaRepository cinemaRepository,
                         AuditoriumRepository auditoriumRepository,
                         MovieRepository movieRepository,
                         UserRepository userRepository,
                         CurrentUserService currentUserService) {
        this.ticketRepository = ticketRepository;
        this.bookingRepository = bookingRepository;
        this.showtimeRepository = showtimeRepository;
        this.cinemaRepository = cinemaRepository;
        this.auditoriumRepository = auditoriumRepository;
        this.movieRepository = movieRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
    }

    public List<CinemaTicketViewResponse> listUpcomingTicketsForCurrentUser() {
        User currentUser = currentUserService.getCurrentUser();
        List<Booking> bookings = bookingRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
        return bookings.stream()
                .map(this::toTicketView)
                .filter(CinemaTicketViewResponse::isUpcoming)
                .collect(Collectors.toList());
    }

    public List<CinemaTicketViewResponse> listBookingHistoryForCurrentUser() {
        User currentUser = currentUserService.getCurrentUser();
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId()).stream()
                .map(this::toTicketView)
                .collect(Collectors.toList());
    }

    public List<CinemaTicketViewResponse> listMyTickets(String segment) {
        List<CinemaTicketViewResponse> all = listBookingHistoryForCurrentUser();
        if (segment == null || segment.isBlank() || "all".equalsIgnoreCase(segment)) {
            return all;
        }

        return switch (segment.trim().toLowerCase()) {
            case "upcoming" -> all.stream()
                    .filter(CinemaTicketViewResponse::isUpcoming)
                    .toList();
            case "past", "used" -> all.stream()
                    .filter(this::isPastUsed)
                    .toList();
            case "cancelled", "failed" -> all.stream()
                    .filter(this::isCancelledOrFailed)
                    .toList();
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid segment. Use: all, upcoming, past, cancelled"
            );
        };
    }

    public CinemaTicketViewResponse getTicketDetailForCurrentUser(String bookingId) {
        User currentUser = currentUserService.getCurrentUser();
        boolean isAdmin = currentUser.getRoles().contains(com.moviex.model.Role.ROLE_ADMIN);
        
        Optional<Booking> bookingOpt = isAdmin 
                ? bookingRepository.findById(bookingId)
                : bookingRepository.findByIdAndUserId(bookingId, currentUser.getId());
                
        Booking booking = bookingOpt.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        return toTicketView(booking);
    }

    public CinemaTicketViewResponse getTicketDetailByCodeForCurrentUser(String ticketCode) {
        if (ticketCode == null || ticketCode.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ticketCode is required");
        }

        User currentUser = currentUserService.getCurrentUser();
        Ticket ticket = ticketRepository.findByTicketCode(ticketCode.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        boolean isAdmin = currentUser.getRoles().contains(com.moviex.model.Role.ROLE_ADMIN);
        Optional<Booking> bookingOpt = isAdmin
                ? bookingRepository.findById(ticket.getBookingId())
                : bookingRepository.findByIdAndUserId(ticket.getBookingId(), currentUser.getId());

        Booking booking = bookingOpt.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        return toTicketView(booking);
    }

    public CinemaTicketViewResponse getTicketValidationByCode(String ticketCode) {
        if (ticketCode == null || ticketCode.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ticketCode is required");
        }

        Ticket ticket = ticketRepository.findByTicketCode(ticketCode.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
        Booking booking = bookingRepository.findById(ticket.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
        return toTicketView(booking);
    }

    public CinemaTicketViewResponse checkInTicketByCodeForAdmin(String ticketCode) {
        validateAdmin();
        if (ticketCode == null || ticketCode.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ticketCode is required");
        }

        Ticket ticket = ticketRepository.findByTicketCode(ticketCode.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
        Booking booking = bookingRepository.findById(ticket.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        if (booking.getBookingStatus() != BookingStatus.CONFIRMED
                || booking.getPaymentStatus() != CinemaPaymentStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only confirmed and paid bookings can be checked in");
        }

        List<Ticket> bookingTickets = ticketRepository.findByBookingId(booking.getId());
        if (bookingTickets.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found");
        }

        boolean alreadyCheckedIn = bookingTickets.stream().allMatch(item -> item.getStatus() == TicketStatus.USED);
        if (!alreadyCheckedIn) {
            LocalDateTime now = LocalDateTime.now();
            User admin = currentUserService.getCurrentUser();
            String staffInfo = admin.getId() + " (" + admin.getEmail() + ")";
            bookingTickets.forEach(item -> {
                item.setStatus(TicketStatus.USED);
                item.setScannedAt(now);
                item.setScannedBy(staffInfo);
            });
            ticketRepository.saveAll(bookingTickets);
        }

        return toTicketView(booking);
    }

    public TicketScanResponse scanTicket(TicketScanRequest request) {
        validateAdmin();
        if (request == null || request.getQrToken() == null || request.getQrToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "qrToken is required");
        }

        Ticket ticket = ticketRepository.findByQrToken(request.getQrToken().trim())
                .orElseThrow(() -> {
                    TicketScanResponse fail = new TicketScanResponse();
                    fail.setState(TicketScanResponse.ScanState.INVALID);
                    fail.setMessage("Invalid QR Token. Ticket not found.");
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found");
                });

        Booking booking = bookingRepository.findById(ticket.getBookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        TicketScanResponse response = new TicketScanResponse();
        response.setTicketDetail(toTicketView(booking));

        // Validation logic
        if (booking.getPaymentStatus() != CinemaPaymentStatus.PAID) {
            response.setState(TicketScanResponse.ScanState.PAYMENT_PENDING);
            response.setMessage("Payment is not completed for this booking.");
            return response;
        }

        if (ticket.getStatus() == TicketStatus.CANCELLED) {
            response.setState(TicketScanResponse.ScanState.INVALID);
            response.setMessage("This ticket has been cancelled.");
            return response;
        }

        if (ticket.getStatus() == TicketStatus.USED) {
            response.setState(TicketScanResponse.ScanState.ALREADY_USED);
            response.setMessage("This ticket has already been used.");
            response.setScannedAt(ticket.getScannedAt());
            response.setScannedBy(ticket.getScannedBy());
            return response;
        }

        if (ticket.getStatus() == TicketStatus.EXPIRED) {
            response.setState(TicketScanResponse.ScanState.EXPIRED);
            response.setMessage("This ticket has expired.");
            return response;
        }

        // Showtime validation
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime showTime = LocalDateTime.of(ticket.getShowDate(), ticket.getStartTime());
        // Allow scan up to 2 hours after start
        if (now.isAfter(showTime.plusHours(2))) {
            ticket.setStatus(TicketStatus.EXPIRED);
            ticketRepository.save(ticket);
            response.setState(TicketScanResponse.ScanState.EXPIRED);
            response.setMessage("This showtime has already ended.");
            return response;
        }

        // Successful scan
        User admin = currentUserService.getCurrentUser();
        ticket.setStatus(TicketStatus.USED);
        ticket.setScannedAt(now);
        ticket.setScannedBy(admin.getId() + " (" + admin.getEmail() + ")");
        ticketRepository.save(ticket);

        response.setState(TicketScanResponse.ScanState.VALID);
        response.setMessage("Ticket successfully validated. Enjoy the movie!");
        response.setScannedAt(ticket.getScannedAt());
        response.setScannedBy(ticket.getScannedBy());

        // Refresh ticket detail with updated status
        response.setTicketDetail(toTicketView(booking));

        return response;
    }

    public List<CinemaTicketViewResponse> listBookingHistoryForAdmin() {
        return bookingRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toTicketViewWithUser)
                .collect(Collectors.toList());
    }

    private CinemaTicketViewResponse toTicketView(Booking booking) {
        return buildTicketView(booking, false);
    }

    private CinemaTicketViewResponse toTicketViewWithUser(Booking booking) {
        return buildTicketView(booking, true);
    }

    private CinemaTicketViewResponse buildTicketView(Booking booking, boolean includeUserMeta) {
        List<Ticket> tickets = ticketRepository.findByBookingId(booking.getId());
        Map<String, String> ticketSeatLabels = tickets.stream()
                .filter(ticket -> ticket.getSeatId() != null && ticket.getSeatLabel() != null)
                .collect(Collectors.toMap(Ticket::getSeatId, Ticket::getSeatLabel, (left, right) -> left));

        Optional<MovieShowtime> showtimeOpt = showtimeRepository.findById(booking.getShowtimeId());
        Optional<Cinema> cinemaOpt = booking.getCinemaId() == null
                ? Optional.empty()
                : cinemaRepository.findById(booking.getCinemaId());
        Optional<Auditorium> auditoriumOpt = booking.getAuditoriumId() == null
                ? Optional.empty()
                : auditoriumRepository.findById(booking.getAuditoriumId());
        Optional<Movie> movieOpt = showtimeOpt
                .map(MovieShowtime::getMovieId)
                .flatMap(movieRepository::findById);

        List<String> seats = booking.getSeats().stream()
                .map(seat -> resolveSeatLabel(seat, ticketSeatLabels))
                .collect(Collectors.toList());

        LocalDate showDate = showtimeOpt.map(MovieShowtime::getShowDate)
                .orElseGet(() -> tickets.stream().map(Ticket::getShowDate).filter(java.util.Objects::nonNull).findFirst().orElse(null));
        LocalTime startTime = showtimeOpt.map(MovieShowtime::getStartTime)
                .orElseGet(() -> tickets.stream().map(Ticket::getStartTime).filter(java.util.Objects::nonNull).findFirst().orElse(null));
        LocalTime endTime = showtimeOpt.map(MovieShowtime::getEndTime)
                .orElseGet(() -> tickets.stream().map(Ticket::getEndTime).filter(java.util.Objects::nonNull).findFirst().orElse(null));

        LocalDateTime issuedAt = tickets.stream()
                .map(Ticket::getIssuedAt)
                .filter(java.util.Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(booking.getUpdatedAt());

        CinemaTicketViewResponse response = new CinemaTicketViewResponse();
        response.setBookingId(booking.getId());
        response.setBookingCode(resolveBookingCode(booking, tickets));
        response.setMovieTitle(resolveMovieTitle(movieOpt, tickets));
        response.setCinemaName(resolveCinemaName(cinemaOpt, tickets));
        response.setAuditoriumName(resolveAuditoriumName(auditoriumOpt, tickets));
        response.setShowDate(showDate);
        response.setStartTime(startTime);
        response.setEndTime(endTime);
        response.setSeats(seats);
        response.setTotalAmount(booking.getTotalPrice());
        response.setPaymentStatus(booking.getPaymentStatus());
        response.setBookingStatus(booking.getBookingStatus());
        response.setIssuedAt(issuedAt);
        response.setCreatedAt(booking.getCreatedAt() == null ? issuedAt : booking.getCreatedAt());
        response.setUpcoming(isUpcoming(booking, showDate, startTime));
        response.setTicketStatus(resolveTicketStatus(tickets));
        response.setCheckedInAt(resolveCheckedInAt(tickets)); // Keep for DTO compatibility but it maps to scannedAt in build phase if needed

        List<String> ticketCodes = tickets.stream()
                .map(Ticket::getTicketCode)
                .filter(code -> code != null && !code.isBlank())
                .distinct()
                .toList();
        response.setTicketCodes(ticketCodes);
        response.setTicketCode(ticketCodes.stream().findFirst().orElse(null));

        List<String> qrTokens = tickets.stream()
                .map(Ticket::getQrToken)
                .filter(token -> token != null && !token.isBlank())
                .distinct()
                .toList();
        response.setQrTokens(qrTokens);
        response.setQrToken(qrTokens.stream().findFirst().orElse(null));

        if (includeUserMeta) {
            response.setUserId(booking.getUserId());
            String email = userRepository.findById(booking.getUserId()).map(User::getEmail).orElse(null);
            response.setUserEmail(email);
        }

        return response;
    }

    private boolean isPastUsed(CinemaTicketViewResponse view) {
        if (view == null) return false;
        if (view.isUpcoming()) return false;
        return view.getBookingStatus() == BookingStatus.CONFIRMED
                && view.getPaymentStatus() == CinemaPaymentStatus.PAID;
    }

    private boolean isCancelledOrFailed(CinemaTicketViewResponse view) {
        if (view == null) return false;
        return view.getBookingStatus() == BookingStatus.CANCELLED
                || view.getBookingStatus() == BookingStatus.EXPIRED
                || view.getPaymentStatus() == CinemaPaymentStatus.FAILED
                || view.getPaymentStatus() == CinemaPaymentStatus.CANCELLED;
    }

    private boolean isUpcoming(Booking booking, LocalDate showDate, LocalTime startTime) {
        if (booking.getBookingStatus() != BookingStatus.CONFIRMED || showDate == null) {
            return false;
        }
        LocalDateTime showDateTime = LocalDateTime.of(showDate, startTime == null ? LocalTime.MIDNIGHT : startTime);
        return showDateTime.isAfter(LocalDateTime.now());
    }

    private String resolveSeatLabel(BookingSeat seat, Map<String, String> ticketSeatLabels) {
        if (seat.getSeatId() != null) {
            String fromTicket = ticketSeatLabels.get(seat.getSeatId());
            if (fromTicket != null && !fromTicket.isBlank()) {
                return fromTicket;
            }
        }
        if (seat.getRow() != null && seat.getNumber() > 0) {
            return seat.getRow() + seat.getNumber();
        }
        return seat.getSeatId() == null ? "-" : seat.getSeatId();
    }

    private String resolveBookingCode(Booking booking, List<Ticket> tickets) {
        if (booking.getBookingCode() != null && !booking.getBookingCode().isBlank()) {
            return booking.getBookingCode();
        }
        String fromTicket = tickets.stream()
                .map(Ticket::getBookingCode)
                .filter(code -> code != null && !code.isBlank())
                .findFirst()
                .orElse(null);
        return fromTicket != null ? fromTicket : "BKG-" + booking.getId();
    }

    private String resolveMovieTitle(Optional<Movie> movieOpt, List<Ticket> tickets) {
        if (movieOpt.isPresent()) {
            return movieOpt.get().getTitle();
        }
        return tickets.stream()
                .map(Ticket::getMovieTitle)
                .filter(title -> title != null && !title.isBlank())
                .findFirst()
                .orElse("Unknown movie");
    }

    private String resolveCinemaName(Optional<Cinema> cinemaOpt, List<Ticket> tickets) {
        if (cinemaOpt.isPresent()) {
            return cinemaOpt.get().getName();
        }
        return tickets.stream()
                .map(Ticket::getCinemaName)
                .filter(name -> name != null && !name.isBlank())
                .findFirst()
                .orElse("Unknown cinema");
    }

    private String resolveAuditoriumName(Optional<Auditorium> auditoriumOpt, List<Ticket> tickets) {
        if (auditoriumOpt.isPresent()) {
            return auditoriumOpt.get().getName();
        }
        return tickets.stream()
                .map(Ticket::getAuditoriumName)
                .filter(name -> name != null && !name.isBlank())
                .findFirst()
                .orElse("Unknown auditorium");
    }

    private TicketStatus resolveTicketStatus(List<Ticket> tickets) {
        if (tickets == null || tickets.isEmpty()) {
            return TicketStatus.ACTIVE;
        }
        if (tickets.stream().anyMatch(ticket -> ticket.getStatus() == TicketStatus.USED)) {
            return TicketStatus.USED;
        }
        if (tickets.stream().anyMatch(ticket -> ticket.getStatus() == TicketStatus.CANCELLED)) {
            return TicketStatus.CANCELLED;
        }
        return tickets.stream()
                .map(Ticket::getStatus)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(TicketStatus.ACTIVE);
    }

    private LocalDateTime resolveCheckedInAt(List<Ticket> tickets) {
        if (tickets == null || tickets.isEmpty()) {
            return null;
        }
        return tickets.stream()
                .map(Ticket::getScannedAt)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
    }

    private void validateAdmin() {
        User currentUser = currentUserService.getCurrentUser();
        boolean isAdmin = currentUser != null
                && currentUser.getRoles() != null
                && currentUser.getRoles().contains(com.moviex.model.Role.ROLE_ADMIN);
        if (!isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }
}
