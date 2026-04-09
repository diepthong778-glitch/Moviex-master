package com.moviex.cinema.service;

import com.moviex.cinema.dto.CinemaTicketViewResponse;
import com.moviex.cinema.model.Auditorium;
import com.moviex.cinema.model.Booking;
import com.moviex.cinema.model.BookingSeat;
import com.moviex.cinema.model.BookingStatus;
import com.moviex.cinema.model.CinemaPaymentStatus;
import com.moviex.cinema.model.Cinema;
import com.moviex.cinema.model.MovieShowtime;
import com.moviex.cinema.model.Ticket;
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
        Booking booking = bookingRepository.findByIdAndUserId(bookingId, currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        return toTicketView(booking);
    }

    public CinemaTicketViewResponse getTicketDetailByCodeForCurrentUser(String ticketCode) {
        if (ticketCode == null || ticketCode.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ticketCode is required");
        }

        User currentUser = currentUserService.getCurrentUser();
        Ticket ticket = ticketRepository.findByTicketCode(ticketCode.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        Booking booking = bookingRepository.findByIdAndUserId(ticket.getBookingId(), currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
        return toTicketView(booking);
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
        List<String> ticketCodes = tickets.stream()
                .map(Ticket::getTicketCode)
                .filter(code -> code != null && !code.isBlank())
                .distinct()
                .toList();
        response.setTicketCodes(ticketCodes);
        response.setTicketCode(ticketCodes.stream().findFirst().orElse(null));

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
}
