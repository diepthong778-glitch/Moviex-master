package com.moviex.config;

import com.moviex.cinema.model.Auditorium;
import com.moviex.cinema.model.Cinema;
import com.moviex.cinema.model.MovieShowtime;
import com.moviex.cinema.model.Seat;
import com.moviex.cinema.model.SeatStatus;
import com.moviex.cinema.model.SeatType;
import com.moviex.cinema.model.ShowtimeStatus;
import com.moviex.cinema.repository.AuditoriumRepository;
import com.moviex.cinema.repository.CinemaRepository;
import com.moviex.cinema.repository.MovieShowtimeRepository;
import com.moviex.cinema.repository.SeatRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class CinemaDataInitializer {

    @Bean
    CommandLineRunner initCinemaDemoData(CinemaRepository cinemaRepository,
                                         AuditoriumRepository auditoriumRepository,
                                         SeatRepository seatRepository,
                                         MovieShowtimeRepository showtimeRepository) {
        return args -> {
            upsertCinemas(cinemaRepository);
            upsertAuditoriums(auditoriumRepository);
            upsertSeats(auditoriumRepository, seatRepository);
            upsertShowtimes(showtimeRepository);
        };
    }

    private void upsertCinemas(CinemaRepository cinemaRepository) {
        saveCinema(cinemaRepository, "cinema-hcm-01", "JDWoMoviex Cinema Saigon Center",
                "65 Le Loi, Ben Nghe Ward, District 1", "Ho Chi Minh City");
        saveCinema(cinemaRepository, "cinema-hn-01", "JDWoMoviex Cinema West Lake",
                "28 Thanh Nien, Tay Ho District", "Hanoi");
        saveCinema(cinemaRepository, "cinema-dn-01", "JDWoMoviex Cinema Han River",
                "12 Bach Dang, Hai Chau District", "Da Nang");
    }

    private void saveCinema(CinemaRepository cinemaRepository, String id, String name, String address, String city) {
        Cinema cinema = cinemaRepository.findById(id).orElse(new Cinema());
        cinema.setId(id);
        cinema.setName(name);
        cinema.setAddress(address);
        cinema.setCity(city);
        cinema.setActive(true);
        cinema.setUpdatedAt(LocalDateTime.now());
        cinemaRepository.save(cinema);
    }

    private void upsertAuditoriums(AuditoriumRepository auditoriumRepository) {
        saveAuditorium(auditoriumRepository, "aud-hcm-a", "cinema-hcm-01", "Hall A");
        saveAuditorium(auditoriumRepository, "aud-hcm-b", "cinema-hcm-01", "Hall B");
        saveAuditorium(auditoriumRepository, "aud-hcm-c", "cinema-hcm-01", "Hall C");
        saveAuditorium(auditoriumRepository, "aud-hcm-d", "cinema-hcm-01", "Hall D");
        saveAuditorium(auditoriumRepository, "aud-hn-1", "cinema-hn-01", "Hall 1");
        saveAuditorium(auditoriumRepository, "aud-hn-3", "cinema-hn-01", "Hall 3");
        saveAuditorium(auditoriumRepository, "aud-dn-2", "cinema-dn-01", "Hall 2");
        saveAuditorium(auditoriumRepository, "aud-dn-4", "cinema-dn-01", "Hall 4");
    }

    private void saveAuditorium(AuditoriumRepository auditoriumRepository, String id, String cinemaId, String name) {
        Auditorium auditorium = auditoriumRepository.findById(id).orElse(new Auditorium());
        auditorium.setId(id);
        auditorium.setCinemaId(cinemaId);
        auditorium.setName(name);
        auditorium.setCapacity(96);
        auditorium.setActive(true);
        auditorium.setUpdatedAt(LocalDateTime.now());
        auditoriumRepository.save(auditorium);
    }

    private void upsertSeats(AuditoriumRepository auditoriumRepository, SeatRepository seatRepository) {
        List<Auditorium> auditoriums = auditoriumRepository.findAll();
        for (Auditorium auditorium : auditoriums) {
            List<Seat> existing = seatRepository.findByAuditoriumId(auditorium.getId());
            if (!existing.isEmpty()) {
                continue;
            }
            List<Seat> toSave = new ArrayList<>();
            for (char row = 'A'; row <= 'H'; row++) {
                for (int number = 1; number <= 12; number++) {
                    Seat seat = new Seat();
                    seat.setId("seat-" + auditorium.getId() + "-" + row + number);
                    seat.setCinemaId(auditorium.getCinemaId());
                    seat.setAuditoriumId(auditorium.getId());
                    seat.setRow(String.valueOf(row));
                    seat.setNumber(number);
                    seat.setType(resolveSeatType(row, number));
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seat.setCreatedAt(LocalDateTime.now());
                    seat.setUpdatedAt(LocalDateTime.now());
                    toSave.add(seat);
                }
            }
            seatRepository.saveAll(toSave);
        }
    }

    private SeatType resolveSeatType(char row, int number) {
        if (row >= 'G') return SeatType.COUPLE;
        if (row == 'C' || row == 'D') return SeatType.VIP;
        if (number <= 0) return SeatType.NORMAL;
        return SeatType.NORMAL;
    }

    private void upsertShowtimes(MovieShowtimeRepository showtimeRepository) {
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        saveShowtime(showtimeRepository, "st-001-1000", "mvx-001", "cinema-hcm-01", "aud-hcm-a", monday.plusDays(0), "10:00", "12:08", 95000);
        saveShowtime(showtimeRepository, "st-001-1320", "mvx-001", "cinema-hcm-01", "aud-hcm-a", monday.plusDays(0), "13:20", "15:28", 95000);
        saveShowtime(showtimeRepository, "st-001-1810", "mvx-001", "cinema-hcm-01", "aud-hcm-a", monday.plusDays(0), "18:10", "20:18", 95000);

        saveShowtime(showtimeRepository, "st-002-1110", "mvx-001", "cinema-hn-01", "aud-hn-3", monday.plusDays(2), "11:10", "13:18", 105000);
        saveShowtime(showtimeRepository, "st-002-1530", "mvx-001", "cinema-hn-01", "aud-hn-3", monday.plusDays(2), "15:30", "17:38", 105000);
        saveShowtime(showtimeRepository, "st-002-2015", "mvx-001", "cinema-hn-01", "aud-hn-3", monday.plusDays(2), "20:15", "22:23", 105000);

        saveShowtime(showtimeRepository, "st-003-1210", "mvx-002", "cinema-hcm-01", "aud-hcm-b", monday.plusDays(1), "12:10", "14:04", 115000);
        saveShowtime(showtimeRepository, "st-003-1600", "mvx-002", "cinema-hcm-01", "aud-hcm-b", monday.plusDays(1), "16:00", "17:54", 115000);
        saveShowtime(showtimeRepository, "st-003-2120", "mvx-002", "cinema-hcm-01", "aud-hcm-b", monday.plusDays(1), "21:20", "23:14", 115000);

        saveShowtime(showtimeRepository, "st-004-0930", "mvx-002", "cinema-dn-01", "aud-dn-2", monday.plusDays(3), "09:30", "11:24", 95000);
        saveShowtime(showtimeRepository, "st-004-1440", "mvx-002", "cinema-dn-01", "aud-dn-2", monday.plusDays(3), "14:40", "16:34", 95000);
        saveShowtime(showtimeRepository, "st-004-1930", "mvx-002", "cinema-dn-01", "aud-dn-2", monday.plusDays(3), "19:30", "21:24", 95000);

        saveShowtime(showtimeRepository, "st-005-1050", "mvx-003", "cinema-hn-01", "aud-hn-1", monday.plusDays(4), "10:50", "13:06", 125000);
        saveShowtime(showtimeRepository, "st-005-1710", "mvx-003", "cinema-hn-01", "aud-hn-1", monday.plusDays(4), "17:10", "19:26", 125000);
        saveShowtime(showtimeRepository, "st-005-2200", "mvx-003", "cinema-hn-01", "aud-hn-1", monday.plusDays(4), "22:00", "00:16", 125000);

        saveShowtime(showtimeRepository, "st-006-0920", "mvx-003", "cinema-hcm-01", "aud-hcm-c", monday.plusDays(5), "09:20", "11:36", 110000);
        saveShowtime(showtimeRepository, "st-006-1340", "mvx-003", "cinema-hcm-01", "aud-hcm-c", monday.plusDays(5), "13:40", "15:56", 110000);
        saveShowtime(showtimeRepository, "st-006-1830", "mvx-003", "cinema-hcm-01", "aud-hcm-c", monday.plusDays(5), "18:30", "20:46", 110000);

        saveShowtime(showtimeRepository, "st-007-1100", "mvx-004", "cinema-dn-01", "aud-dn-4", monday.plusDays(6), "11:00", "12:42", 85000);
        saveShowtime(showtimeRepository, "st-007-1510", "mvx-004", "cinema-dn-01", "aud-dn-4", monday.plusDays(6), "15:10", "16:52", 85000);
        saveShowtime(showtimeRepository, "st-007-2040", "mvx-004", "cinema-dn-01", "aud-dn-4", monday.plusDays(6), "20:40", "22:22", 85000);

        saveShowtime(showtimeRepository, "st-008-1030", "mvx-004", "cinema-hcm-01", "aud-hcm-d", monday.plusDays(2), "10:30", "12:12", 90000);
        saveShowtime(showtimeRepository, "st-008-1450", "mvx-004", "cinema-hcm-01", "aud-hcm-d", monday.plusDays(2), "14:50", "16:32", 90000);
        saveShowtime(showtimeRepository, "st-008-1900", "mvx-004", "cinema-hcm-01", "aud-hcm-d", monday.plusDays(2), "19:00", "20:42", 90000);
    }

    private void saveShowtime(MovieShowtimeRepository repository,
                              String id,
                              String movieId,
                              String cinemaId,
                              String auditoriumId,
                              LocalDate showDate,
                              String startTime,
                              String endTime,
                              int price) {
        MovieShowtime showtime = repository.findById(id).orElse(new MovieShowtime());
        showtime.setId(id);
        showtime.setMovieId(movieId);
        showtime.setCinemaId(cinemaId);
        showtime.setAuditoriumId(auditoriumId);
        showtime.setShowDate(showDate);
        showtime.setStartTime(LocalTime.parse(startTime));
        showtime.setEndTime(LocalTime.parse(endTime));
        showtime.setBasePrice(BigDecimal.valueOf(price));
        showtime.setStatus(ShowtimeStatus.SCHEDULED);
        showtime.setUpdatedAt(LocalDateTime.now());
        repository.save(showtime);
    }
}
