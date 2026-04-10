package com.moviex.cinema.service;

import com.moviex.cinema.model.Booking;
import com.moviex.cinema.model.BookingStatus;
import com.moviex.cinema.model.Cinema;
import com.moviex.cinema.model.CinemaPaymentStatus;
import com.moviex.cinema.model.MovieShowtime;
import com.moviex.cinema.model.PaymentTransaction;
import com.moviex.cinema.repository.BookingRepository;
import com.moviex.cinema.repository.CinemaPaymentTransactionRepository;
import com.moviex.cinema.repository.CinemaRepository;
import com.moviex.cinema.repository.MovieShowtimeRepository;
import com.moviex.model.Movie;
import com.moviex.repository.MovieRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CinemaRevenueAnalyticsService {
    private static final String CURRENCY = "VND";

    private final BookingRepository bookingRepository;
    private final CinemaPaymentTransactionRepository paymentTransactionRepository;
    private final MovieShowtimeRepository showtimeRepository;
    private final CinemaRepository cinemaRepository;
    private final MovieRepository movieRepository;

    public CinemaRevenueAnalyticsService(BookingRepository bookingRepository,
                                         CinemaPaymentTransactionRepository paymentTransactionRepository,
                                         MovieShowtimeRepository showtimeRepository,
                                         CinemaRepository cinemaRepository,
                                         MovieRepository movieRepository) {
        this.bookingRepository = bookingRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.showtimeRepository = showtimeRepository;
        this.cinemaRepository = cinemaRepository;
        this.movieRepository = movieRepository;
    }

    public Map<String, Object> getDailyRevenue(LocalDate date) {
        LocalDate targetDate = date == null ? LocalDate.now() : date;
        List<PaidBookingRecord> records = filterByDateRange(buildSuccessfulPaidRecords(), targetDate, targetDate);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("date", targetDate);
        response.put("bookings", records.size());
        response.put("tickets", sumTickets(records));
        response.put("revenue", sumRevenue(records));
        response.put("currency", CURRENCY);
        return response;
    }

    public Map<String, Object> getWeeklyRevenue(LocalDate date) {
        LocalDate anchorDate = date == null ? LocalDate.now() : date;
        LocalDate startDate = anchorDate.with(DayOfWeek.MONDAY);
        LocalDate endDate = startDate.plusDays(6);

        List<PaidBookingRecord> records = filterByDateRange(buildSuccessfulPaidRecords(), startDate, endDate);
        Map<LocalDate, List<PaidBookingRecord>> recordsByDate = records.stream()
                .collect(Collectors.groupingBy(record -> record.paidAt().toLocalDate()));

        List<Map<String, Object>> daily = new ArrayList<>();
        for (LocalDate cursor = startDate; !cursor.isAfter(endDate); cursor = cursor.plusDays(1)) {
            daily.add(buildDailyPoint(cursor, recordsByDate.getOrDefault(cursor, List.of())));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("startDate", startDate);
        response.put("endDate", endDate);
        response.put("bookings", records.size());
        response.put("tickets", sumTickets(records));
        response.put("revenue", sumRevenue(records));
        response.put("currency", CURRENCY);
        response.put("daily", daily);
        return response;
    }

    public Map<String, Object> getMonthlyRevenue(LocalDate date) {
        LocalDate anchorDate = date == null ? LocalDate.now() : date;
        YearMonth month = YearMonth.from(anchorDate);
        LocalDate startDate = month.atDay(1);
        LocalDate endDate = month.atEndOfMonth();

        List<PaidBookingRecord> records = filterByDateRange(buildSuccessfulPaidRecords(), startDate, endDate);
        Map<LocalDate, List<PaidBookingRecord>> recordsByDate = records.stream()
                .collect(Collectors.groupingBy(record -> record.paidAt().toLocalDate()));

        List<Map<String, Object>> daily = new ArrayList<>();
        for (LocalDate cursor = startDate; !cursor.isAfter(endDate); cursor = cursor.plusDays(1)) {
            daily.add(buildDailyPoint(cursor, recordsByDate.getOrDefault(cursor, List.of())));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("startDate", startDate);
        response.put("endDate", endDate);
        response.put("bookings", records.size());
        response.put("tickets", sumTickets(records));
        response.put("revenue", sumRevenue(records));
        response.put("currency", CURRENCY);
        response.put("daily", daily);
        return response;
    }

    public Map<String, Object> getRevenueByCinema(LocalDate fromDate, LocalDate toDate) {
        LocalDate[] range = resolveRange(fromDate, toDate);
        List<PaidBookingRecord> records = filterByDateRange(buildSuccessfulPaidRecords(), range[0], range[1]);

        Map<String, RevenueAggregate> aggregateByCinema = new HashMap<>();
        Map<String, String> cinemaNameById = new HashMap<>();

        for (PaidBookingRecord record : records) {
            String cinemaId = isBlank(record.cinemaId()) ? "unknown" : record.cinemaId();
            String cinemaName = isBlank(record.cinemaName()) ? "Unknown cinema" : record.cinemaName();
            aggregateByCinema.computeIfAbsent(cinemaId, key -> new RevenueAggregate()).add(record);
            cinemaNameById.putIfAbsent(cinemaId, cinemaName);
        }

        List<Map<String, Object>> items = aggregateByCinema.entrySet().stream()
                .sorted((left, right) -> {
                    int revenueCompare = right.getValue().revenue.compareTo(left.getValue().revenue);
                    if (revenueCompare != 0) {
                        return revenueCompare;
                    }
                    return Long.compare(right.getValue().bookings, left.getValue().bookings);
                })
                .map(entry -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("cinemaId", "unknown".equals(entry.getKey()) ? null : entry.getKey());
                    row.put("cinemaName", cinemaNameById.getOrDefault(entry.getKey(), "Unknown cinema"));
                    row.put("bookings", entry.getValue().bookings);
                    row.put("tickets", entry.getValue().tickets);
                    row.put("revenue", entry.getValue().revenue);
                    return row;
                })
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("fromDate", range[0]);
        response.put("toDate", range[1]);
        response.put("currency", CURRENCY);
        response.put("bookings", records.size());
        response.put("tickets", sumTickets(records));
        response.put("totalRevenue", sumRevenue(records));
        response.put("items", items);
        return response;
    }

    public Map<String, Object> getRevenueByMovie(LocalDate fromDate, LocalDate toDate) {
        LocalDate[] range = resolveRange(fromDate, toDate);
        List<PaidBookingRecord> records = filterByDateRange(buildSuccessfulPaidRecords(), range[0], range[1]);

        Map<String, RevenueAggregate> aggregateByMovie = new HashMap<>();
        Map<String, String> movieTitleById = new HashMap<>();

        for (PaidBookingRecord record : records) {
            String movieId = isBlank(record.movieId()) ? "unknown" : record.movieId();
            String movieTitle = isBlank(record.movieTitle()) ? "Unknown movie" : record.movieTitle();
            aggregateByMovie.computeIfAbsent(movieId, key -> new RevenueAggregate()).add(record);
            movieTitleById.putIfAbsent(movieId, movieTitle);
        }

        List<Map<String, Object>> items = aggregateByMovie.entrySet().stream()
                .sorted((left, right) -> {
                    int revenueCompare = right.getValue().revenue.compareTo(left.getValue().revenue);
                    if (revenueCompare != 0) {
                        return revenueCompare;
                    }
                    return Long.compare(right.getValue().bookings, left.getValue().bookings);
                })
                .map(entry -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("movieId", "unknown".equals(entry.getKey()) ? null : entry.getKey());
                    row.put("movieTitle", movieTitleById.getOrDefault(entry.getKey(), "Unknown movie"));
                    row.put("bookings", entry.getValue().bookings);
                    row.put("tickets", entry.getValue().tickets);
                    row.put("revenue", entry.getValue().revenue);
                    return row;
                })
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("fromDate", range[0]);
        response.put("toDate", range[1]);
        response.put("currency", CURRENCY);
        response.put("bookings", records.size());
        response.put("tickets", sumTickets(records));
        response.put("totalRevenue", sumRevenue(records));
        response.put("items", items);
        return response;
    }

    public Map<String, Object> getRevenueByShowtime(LocalDate fromDate, LocalDate toDate) {
        LocalDate[] range = resolveRange(fromDate, toDate);
        List<PaidBookingRecord> records = filterByDateRange(buildSuccessfulPaidRecords(), range[0], range[1]);

        Map<String, RevenueAggregate> aggregateByShowtime = new HashMap<>();
        Map<String, String> showtimeIdByKey = new HashMap<>();
        Map<String, LocalDate> showDateByKey = new HashMap<>();
        Map<String, LocalTime> startTimeByKey = new HashMap<>();
        Map<String, String> cinemaNameByKey = new HashMap<>();
        Map<String, String> movieTitleByKey = new HashMap<>();

        for (PaidBookingRecord record : records) {
            String key = isBlank(record.showtimeId()) ? "booking:" + record.bookingId() : record.showtimeId();
            aggregateByShowtime.computeIfAbsent(key, ignored -> new RevenueAggregate()).add(record);
            showtimeIdByKey.putIfAbsent(key, record.showtimeId());
            showDateByKey.putIfAbsent(key, record.showDate());
            startTimeByKey.putIfAbsent(key, record.startTime());
            cinemaNameByKey.putIfAbsent(key, isBlank(record.cinemaName()) ? "Unknown cinema" : record.cinemaName());
            movieTitleByKey.putIfAbsent(key, isBlank(record.movieTitle()) ? "Unknown movie" : record.movieTitle());
        }

        List<Map<String, Object>> items = aggregateByShowtime.entrySet().stream()
                .sorted((left, right) -> {
                    int revenueCompare = right.getValue().revenue.compareTo(left.getValue().revenue);
                    if (revenueCompare != 0) {
                        return revenueCompare;
                    }
                    LocalDate rightDate = showDateByKey.get(right.getKey());
                    LocalDate leftDate = showDateByKey.get(left.getKey());
                    if (rightDate == null && leftDate == null) {
                        return 0;
                    }
                    if (rightDate == null) {
                        return 1;
                    }
                    if (leftDate == null) {
                        return -1;
                    }
                    return rightDate.compareTo(leftDate);
                })
                .map(entry -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("showtimeId", showtimeIdByKey.get(entry.getKey()));
                    row.put("showDate", showDateByKey.get(entry.getKey()));
                    row.put("startTime", startTimeByKey.get(entry.getKey()));
                    row.put("cinemaName", cinemaNameByKey.get(entry.getKey()));
                    row.put("movieTitle", movieTitleByKey.get(entry.getKey()));
                    row.put("bookings", entry.getValue().bookings);
                    row.put("tickets", entry.getValue().tickets);
                    row.put("revenue", entry.getValue().revenue);
                    return row;
                })
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("fromDate", range[0]);
        response.put("toDate", range[1]);
        response.put("currency", CURRENCY);
        response.put("bookings", records.size());
        response.put("tickets", sumTickets(records));
        response.put("totalRevenue", sumRevenue(records));
        response.put("items", items);
        return response;
    }

    private List<PaidBookingRecord> buildSuccessfulPaidRecords() {
        Map<String, Booking> bookingById = new HashMap<>();
        for (Booking booking : bookingRepository.findAll()) {
            if (!isBlank(booking.getId())) {
                bookingById.put(booking.getId(), booking);
            }
        }

        Map<String, PaymentTransaction> latestPaidTransactionByBookingId = new HashMap<>();
        for (PaymentTransaction transaction : paymentTransactionRepository.findAll()) {
            if (transaction.getStatus() != CinemaPaymentStatus.PAID || isBlank(transaction.getBookingId())) {
                continue;
            }
            String bookingId = transaction.getBookingId();
            PaymentTransaction existing = latestPaidTransactionByBookingId.get(bookingId);
            if (existing == null || isAfter(resolvePaidAt(transaction, null), resolvePaidAt(existing, null))) {
                latestPaidTransactionByBookingId.put(bookingId, transaction);
            }
        }

        Map<String, MovieShowtime> showtimeById = new HashMap<>();
        for (MovieShowtime showtime : showtimeRepository.findAll()) {
            if (!isBlank(showtime.getId())) {
                showtimeById.put(showtime.getId(), showtime);
            }
        }

        Map<String, Cinema> cinemaById = new HashMap<>();
        for (Cinema cinema : cinemaRepository.findAll()) {
            if (!isBlank(cinema.getId())) {
                cinemaById.put(cinema.getId(), cinema);
            }
        }

        Map<String, Movie> movieById = new HashMap<>();
        for (Movie movie : movieRepository.findAll()) {
            if (!isBlank(movie.getId())) {
                movieById.put(movie.getId(), movie);
            }
        }

        List<PaidBookingRecord> records = new ArrayList<>();
        for (Map.Entry<String, PaymentTransaction> entry : latestPaidTransactionByBookingId.entrySet()) {
            Booking booking = bookingById.get(entry.getKey());
            if (!isSuccessfulPaidBooking(booking)) {
                continue;
            }

            PaymentTransaction transaction = entry.getValue();
            LocalDateTime paidAt = resolvePaidAt(transaction, booking);
            if (paidAt == null) {
                continue;
            }

            MovieShowtime showtime = isBlank(booking.getShowtimeId()) ? null : showtimeById.get(booking.getShowtimeId());
            Cinema cinema = isBlank(booking.getCinemaId()) ? null : cinemaById.get(booking.getCinemaId());
            Movie movie = showtime == null || isBlank(showtime.getMovieId()) ? null : movieById.get(showtime.getMovieId());

            BigDecimal revenue = booking.getTotalPrice() != null
                    ? booking.getTotalPrice()
                    : (transaction.getAmount() == null ? BigDecimal.ZERO : transaction.getAmount());
            int ticketCount = booking.getSeats() == null ? 0 : booking.getSeats().size();

            records.add(new PaidBookingRecord(
                    booking.getId(),
                    booking.getCinemaId(),
                    resolveCinemaName(cinema, booking),
                    showtime == null ? null : showtime.getMovieId(),
                    resolveMovieTitle(movie, showtime),
                    booking.getShowtimeId(),
                    showtime == null ? null : showtime.getShowDate(),
                    showtime == null ? null : showtime.getStartTime(),
                    paidAt,
                    revenue,
                    ticketCount
            ));
        }

        records.sort(Comparator.comparing(PaidBookingRecord::paidAt).reversed());
        return records;
    }

    private List<PaidBookingRecord> filterByDateRange(List<PaidBookingRecord> records, LocalDate fromDate, LocalDate toDate) {
        if (fromDate == null && toDate == null) {
            return records;
        }
        return records.stream()
                .filter(record -> {
                    LocalDate paidDate = record.paidAt().toLocalDate();
                    if (fromDate != null && paidDate.isBefore(fromDate)) {
                        return false;
                    }
                    if (toDate != null && paidDate.isAfter(toDate)) {
                        return false;
                    }
                    return true;
                })
                .toList();
    }

    private Map<String, Object> buildDailyPoint(LocalDate date, List<PaidBookingRecord> records) {
        Map<String, Object> point = new LinkedHashMap<>();
        point.put("date", date);
        point.put("bookings", records.size());
        point.put("tickets", sumTickets(records));
        point.put("revenue", sumRevenue(records));
        return point;
    }

    private LocalDate[] resolveRange(LocalDate fromDate, LocalDate toDate) {
        LocalDate resolvedTo = toDate == null ? LocalDate.now() : toDate;
        LocalDate resolvedFrom = fromDate == null ? resolvedTo.withDayOfMonth(1) : fromDate;
        if (resolvedFrom.isAfter(resolvedTo)) {
            LocalDate temp = resolvedFrom;
            resolvedFrom = resolvedTo;
            resolvedTo = temp;
        }
        return new LocalDate[] { resolvedFrom, resolvedTo };
    }

    private long sumTickets(List<PaidBookingRecord> records) {
        return records.stream().mapToLong(PaidBookingRecord::ticketCount).sum();
    }

    private BigDecimal sumRevenue(List<PaidBookingRecord> records) {
        return records.stream()
                .map(PaidBookingRecord::revenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private LocalDateTime resolvePaidAt(PaymentTransaction transaction, Booking booking) {
        if (transaction != null && transaction.getUpdatedAt() != null) {
            return transaction.getUpdatedAt();
        }
        if (transaction != null && transaction.getCreatedAt() != null) {
            return transaction.getCreatedAt();
        }
        if (booking != null && booking.getUpdatedAt() != null) {
            return booking.getUpdatedAt();
        }
        return booking == null ? null : booking.getCreatedAt();
    }

    private String resolveCinemaName(Cinema cinema, Booking booking) {
        if (cinema != null && !isBlank(cinema.getName())) {
            return cinema.getName();
        }
        if (booking != null && !isBlank(booking.getCinemaId())) {
            return booking.getCinemaId();
        }
        return "Unknown cinema";
    }

    private String resolveMovieTitle(Movie movie, MovieShowtime showtime) {
        if (movie != null && !isBlank(movie.getTitle())) {
            return movie.getTitle();
        }
        if (showtime != null && !isBlank(showtime.getMovieId())) {
            return showtime.getMovieId();
        }
        return "Unknown movie";
    }

    private boolean isSuccessfulPaidBooking(Booking booking) {
        return booking != null
                && booking.getBookingStatus() == BookingStatus.CONFIRMED
                && booking.getPaymentStatus() == CinemaPaymentStatus.PAID;
    }

    private boolean isAfter(LocalDateTime value, LocalDateTime reference) {
        if (value == null) {
            return false;
        }
        if (reference == null) {
            return true;
        }
        return value.isAfter(reference);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static final class RevenueAggregate {
        private long bookings;
        private long tickets;
        private BigDecimal revenue = BigDecimal.ZERO;

        private void add(PaidBookingRecord record) {
            bookings++;
            tickets += record.ticketCount();
            revenue = revenue.add(record.revenue());
        }
    }

    private record PaidBookingRecord(
            String bookingId,
            String cinemaId,
            String cinemaName,
            String movieId,
            String movieTitle,
            String showtimeId,
            LocalDate showDate,
            LocalTime startTime,
            LocalDateTime paidAt,
            BigDecimal revenue,
            int ticketCount
    ) {}
}
