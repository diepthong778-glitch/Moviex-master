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
import com.moviex.model.Movie;
import com.moviex.model.SubscriptionPlan;
import com.moviex.repository.MovieRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Configuration
public class CinemaDataInitializer {

    @Bean
    @ConditionalOnProperty(prefix = "app.seed.cinema-demo", name = "enabled", havingValue = "true", matchIfMissing = true)
    CommandLineRunner initCinemaDemoData(CinemaRepository cinemaRepository,
                                         AuditoriumRepository auditoriumRepository,
                                         SeatRepository seatRepository,
                                         MovieShowtimeRepository showtimeRepository,
                                         MovieRepository movieRepository) {
        return args -> {
            Map<String, String> movieIdsByCode = upsertDemoMovies(movieRepository);
            upsertCinemas(cinemaRepository);
            upsertAuditoriums(auditoriumRepository);
            upsertSeats(auditoriumRepository, seatRepository);
            upsertShowtimes(showtimeRepository, movieIdsByCode);
        };
    }

    private Map<String, String> upsertDemoMovies(MovieRepository movieRepository) {
        List<MovieSeed> seeds = buildCinemaMovieSeeds();

        Map<String, Movie> existingByTitle = movieRepository.findAll().stream()
                .filter(movie -> movie.getTitle() != null && !movie.getTitle().isBlank())
                .collect(Collectors.toMap(
                        movie -> normalizeTitle(movie.getTitle()),
                        movie -> movie,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));

        Map<String, String> movieIdsByCode = new LinkedHashMap<>();
        for (MovieSeed seed : seeds) {
            Movie movie = existingByTitle.get(seed.normalizedTitle());
            if (movie == null) {
                movie = movieRepository.findById(seed.id()).orElse(new Movie());
                if (movie.getId() == null) {
                    movie.setId(seed.id());
                }
            }

            movie.setTitle(seed.title());
            movie.setGenre(seed.genre());
            movie.setYear(seed.year());
            movie.setDescription(seed.description());
            movie.setVideoUrl(null);
            movie.setTrailerUrl(seed.trailerUrl());
            movie.setPosterUrl(seed.posterUrl());
            movie.setBackdropUrl(seed.backdropUrl());
            movie.setOriginalTitle(seed.originalTitle());
            movie.setRuntimeMinutes(seed.runtimeMinutes());
            movie.setAgeRating(seed.ageRating());
            movie.setDirector(seed.director());
            movie.setCast(seed.cast());
            movie.setLanguage(seed.language());
            movie.setRequiredSubscription(seed.plan());

            Movie saved = movieRepository.save(movie);
            movieIdsByCode.put(seed.id(), saved.getId());
        }

        return movieIdsByCode;
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
        saveAuditorium(auditoriumRepository, "aud-hcm-a", "cinema-hcm-01", "Hall A", 96);
        saveAuditorium(auditoriumRepository, "aud-hcm-b", "cinema-hcm-01", "Hall B", 96);
        saveAuditorium(auditoriumRepository, "aud-hcm-c", "cinema-hcm-01", "Hall C", 96);

        saveAuditorium(auditoriumRepository, "aud-hn-1", "cinema-hn-01", "Hall 1", 96);
        saveAuditorium(auditoriumRepository, "aud-hn-2", "cinema-hn-01", "Hall 2", 96);
        saveAuditorium(auditoriumRepository, "aud-hn-3", "cinema-hn-01", "Hall 3", 96);

        saveAuditorium(auditoriumRepository, "aud-dn-1", "cinema-dn-01", "Hall 1", 96);
        saveAuditorium(auditoriumRepository, "aud-dn-2", "cinema-dn-01", "Hall 2", 96);
    }

    private void saveAuditorium(AuditoriumRepository auditoriumRepository,
                                String id,
                                String cinemaId,
                                String name,
                                int capacity) {
        Auditorium auditorium = auditoriumRepository.findById(id).orElse(new Auditorium());
        auditorium.setId(id);
        auditorium.setCinemaId(cinemaId);
        auditorium.setName(name);
        auditorium.setCapacity(capacity);
        auditorium.setActive(true);
        auditorium.setUpdatedAt(LocalDateTime.now());
        auditoriumRepository.save(auditorium);
    }

    private void upsertSeats(AuditoriumRepository auditoriumRepository, SeatRepository seatRepository) {
        List<Auditorium> auditoriums = auditoriumRepository.findAll();
        for (Auditorium auditorium : auditoriums) {
            List<Seat> existingSeats = seatRepository.findByAuditoriumId(auditorium.getId());
            Set<String> existingKeys = existingSeats.stream()
                    .map(seat -> seat.getRow() + "-" + seat.getNumber())
                    .collect(Collectors.toSet());

            List<Seat> seatsToCreate = new ArrayList<>();
            for (char row = 'A'; row <= 'H'; row++) {
                for (int number = 1; number <= 12; number++) {
                    String key = row + "-" + number;
                    if (existingKeys.contains(key)) {
                        continue;
                    }

                    Seat seat = new Seat();
                    seat.setId("seat-" + auditorium.getId() + "-" + row + number);
                    seat.setCinemaId(auditorium.getCinemaId());
                    seat.setAuditoriumId(auditorium.getId());
                    seat.setRow(String.valueOf(row));
                    seat.setNumber(number);
                    seat.setType(resolveSeatType(row));
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seat.setCreatedAt(LocalDateTime.now());
                    seat.setUpdatedAt(LocalDateTime.now());
                    seatsToCreate.add(seat);
                }
            }

            if (!seatsToCreate.isEmpty()) {
                seatRepository.saveAll(seatsToCreate);
            }
        }
    }

    private SeatType resolveSeatType(char row) {
        if (row >= 'G') {
            return SeatType.COUPLE;
        }
        if (row == 'C' || row == 'D') {
            return SeatType.VIP;
        }
        return SeatType.NORMAL;
    }

    private void upsertShowtimes(MovieShowtimeRepository showtimeRepository, Map<String, String> movieIdsByCode) {
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<MovieSeed> movieSeeds = buildCinemaMovieSeeds();
        List<String> movieCodes = movieSeeds.stream()
                .map(MovieSeed::id)
                .toList();
        Map<String, Integer> runtimeByCode = movieSeeds.stream()
                .collect(Collectors.toMap(
                        MovieSeed::id,
                        seed -> seed.runtimeMinutes() != null ? seed.runtimeMinutes() : 120,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));

        List<HallSeed> halls = List.of(
                new HallSeed("cinema-hcm-01", "aud-hcm-a", 98000),
                new HallSeed("cinema-hcm-01", "aud-hcm-b", 108000),
                new HallSeed("cinema-hcm-01", "aud-hcm-c", 118000),
                new HallSeed("cinema-hn-01", "aud-hn-1", 102000),
                new HallSeed("cinema-hn-01", "aud-hn-2", 92000),
                new HallSeed("cinema-hn-01", "aud-hn-3", 120000),
                new HallSeed("cinema-dn-01", "aud-dn-1", 90000),
                new HallSeed("cinema-dn-01", "aud-dn-2", 98000)
        );

        List<LocalTime> slotStarts = List.of(
                LocalTime.of(9, 20),
                LocalTime.of(13, 30),
                LocalTime.of(18, 10)
        );

        int showsPerDay = halls.size() * slotStarts.size();
        for (int dayOffset = 0; dayOffset < 7; dayOffset++) {
            LocalDate showDate = monday.plusDays(dayOffset);
            boolean weekend = dayOffset >= 5;

            for (int hallIndex = 0; hallIndex < halls.size(); hallIndex++) {
                HallSeed hall = halls.get(hallIndex);
                String hallCode = hall.auditoriumId().replace("aud-", "").replace("-", "");

                for (int slotIndex = 0; slotIndex < slotStarts.size(); slotIndex++) {
                    int movieIndex = (dayOffset * showsPerDay + hallIndex * slotStarts.size() + slotIndex) % movieCodes.size();
                    String movieCode = movieCodes.get(movieIndex);
                    String movieId = resolveMovieId(movieIdsByCode, movieCode);

                    LocalTime startTime = slotStarts.get(slotIndex);
                    int runtimeMinutes = runtimeByCode.getOrDefault(movieCode, 120);
                    LocalTime endTime = startTime.plusMinutes(runtimeMinutes + 15L);

                    int weekendSurcharge = weekend ? 12000 : 0;
                    int slotSurcharge = slotIndex * 5000;
                    int finalPrice = hall.basePrice() + weekendSurcharge + slotSurcharge;

                    String showtimeId = String.format("st-auto-%s-d%d-s%d", hallCode, dayOffset + 1, slotIndex + 1);
                    saveShowtime(
                            showtimeRepository,
                            showtimeId,
                            movieId,
                            hall.cinemaId(),
                            hall.auditoriumId(),
                            showDate,
                            startTime.toString(),
                            endTime.toString(),
                            finalPrice
                    );
                }
            }
        }
    }

    private String resolveMovieId(Map<String, String> movieIdsByCode, String movieCode) {
        String movieId = movieIdsByCode.get(movieCode);
        if (movieId == null || movieId.isBlank()) {
            throw new IllegalStateException("Missing demo movie id for code: " + movieCode);
        }
        return movieId;
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

    private List<MovieSeed> buildCinemaMovieSeeds() {
        return List.of(
                new MovieSeed("mvx-001", "La La Land", "La La Land", "Romance, Drama", 2016, 128, "PG-13",
                        "Damien Chazelle", List.of("Ryan Gosling", "Emma Stone", "John Legend"), "English",
                        "A jazz pianist and an aspiring actress fall in love while chasing their dreams in Los Angeles.",
                        "https://www.youtube.com/watch?v=0pdqf4P9MB8",
                        "https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
                        "https://image.tmdb.org/t/p/original/nAOWM9PUJdCByx9f5jR7I7M0QxJ.jpg",
                        SubscriptionPlan.BASIC),
                new MovieSeed("mvx-002", "John Wick: Chapter 4", "John Wick: Chapter 4", "Action, Thriller", 2023, 169, "R",
                        "Chad Stahelski", List.of("Keanu Reeves", "Donnie Yen", "Bill Skarsgard"), "English",
                        "John Wick battles the High Table in a relentless global fight for freedom.",
                        "https://www.youtube.com/watch?v=qEVUtrk8_B4",
                        "https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg",
                        "https://image.tmdb.org/t/p/original/7I6VUdPj6tQECNHdviJkUHD2u89.jpg",
                        SubscriptionPlan.PREMIUM),
                new MovieSeed("mvx-003", "Dune", "Dune", "Sci-Fi, Adventure", 2021, 155, "PG-13",
                        "Denis Villeneuve", List.of("Timothee Chalamet", "Rebecca Ferguson", "Zendaya"), "English",
                        "Paul Atreides arrives on Arrakis and is drawn into a destiny that can reshape the universe.",
                        "https://www.youtube.com/watch?v=n9xhJrPXop4",
                        "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
                        "https://image.tmdb.org/t/p/original/iopYFB1b6Bh7FWZh3onQhph1sih.jpg",
                        SubscriptionPlan.PREMIUM),
                new MovieSeed("mvx-004", "Free Guy", "Free Guy", "Comedy, Action", 2021, 115, "PG-13",
                        "Shawn Levy", List.of("Ryan Reynolds", "Jodie Comer", "Joe Keery"), "English",
                        "A video game NPC discovers his world is fake and decides to become a hero.",
                        "https://www.youtube.com/watch?v=X2m-08cOAbc",
                        "https://image.tmdb.org/t/p/w500/xmbU4JTUm8rsdtn7Y3Fcm30GpeT.jpg",
                        "https://image.tmdb.org/t/p/original/j28p5VwI5ieZnNwfeuZ5Ve3mPsn.jpg",
                        SubscriptionPlan.BASIC),
                new MovieSeed("mvx-005", "Oppenheimer", "Oppenheimer", "Drama, History", 2023, 180, "R",
                        "Christopher Nolan", List.of("Cillian Murphy", "Emily Blunt", "Robert Downey Jr."), "English",
                        "The story of J. Robert Oppenheimer and the creation of the atomic bomb.",
                        "https://www.youtube.com/watch?v=uYPbbksJxIg",
                        "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
                        "https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
                        SubscriptionPlan.PREMIUM),
                new MovieSeed("mvx-006", "A Quiet Place", "A Quiet Place", "Horror, Thriller", 2018, 90, "PG-13",
                        "John Krasinski", List.of("Emily Blunt", "John Krasinski", "Millicent Simmonds"), "English",
                        "A family survives in near silence in a world where sound attracts deadly creatures.",
                        "https://www.youtube.com/watch?v=WR7cc5t7tv8",
                        "https://image.tmdb.org/t/p/w500/nAU74GmpUk7t5iklEp3bufwDq4n.jpg",
                        "https://image.tmdb.org/t/p/original/roYyPiQDQKmIKUEhO912693tSja.jpg",
                        SubscriptionPlan.PREMIUM),
                new MovieSeed("mvx-007", "Top Gun: Maverick", "Top Gun: Maverick", "Action, Drama", 2022, 131, "PG-13",
                        "Joseph Kosinski", List.of("Tom Cruise", "Miles Teller", "Jennifer Connelly"), "English",
                        "Veteran pilot Maverick returns to train a new generation for a high-risk mission.",
                        "https://www.youtube.com/watch?v=giXco2jaZ_4",
                        "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
                        "https://image.tmdb.org/t/p/original/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg",
                        SubscriptionPlan.PREMIUM),
                new MovieSeed("mvx-008", "Mission: Impossible - Dead Reckoning Part One", "Mission: Impossible - Dead Reckoning Part One", "Action, Spy", 2023, 163, "PG-13",
                        "Christopher McQuarrie", List.of("Tom Cruise", "Hayley Atwell", "Ving Rhames"), "English",
                        "Ethan Hunt and his IMF team race to stop a rogue AI from destabilizing global security.",
                        "https://www.youtube.com/watch?v=avz06PDqDbM",
                        "https://image.tmdb.org/t/p/w500/NNxYkU70HPurnNCSiCjYAmacwm.jpg",
                        "https://image.tmdb.org/t/p/original/628Dep6AxEtDxjZoGP78TsOxYbK.jpg",
                        SubscriptionPlan.STANDARD),
                new MovieSeed("mvx-009", "Mad Max: Fury Road", "Mad Max: Fury Road", "Action, Adventure", 2015, 120, "R",
                        "George Miller", List.of("Tom Hardy", "Charlize Theron", "Nicholas Hoult"), "English",
                        "Max teams up with Furiosa in a high-speed revolt across a brutal desert wasteland.",
                        "https://www.youtube.com/watch?v=hEJnMQG9ev8",
                        "https://image.tmdb.org/t/p/w500/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
                        "https://image.tmdb.org/t/p/original/kqjL17yufvn9OVLyXYpvtyrFfak.jpg",
                        SubscriptionPlan.STANDARD),
                new MovieSeed("mvx-010", "Blade Runner 2049", "Blade Runner 2049", "Sci-Fi, Mystery", 2017, 164, "R",
                        "Denis Villeneuve", List.of("Ryan Gosling", "Harrison Ford", "Ana de Armas"), "English",
                        "A replicant blade runner uncovers a secret that could change humanity forever.",
                        "https://www.youtube.com/watch?v=gCcx85zbxz4",
                        "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
                        "https://image.tmdb.org/t/p/original/iFfxCkHnNS8GXvjL8b9bA0bU8aS.jpg",
                        SubscriptionPlan.STANDARD),
                new MovieSeed("mvx-011", "The Martian", "The Martian", "Sci-Fi, Adventure", 2015, 144, "PG-13",
                        "Ridley Scott", List.of("Matt Damon", "Jessica Chastain", "Chiwetel Ejiofor"), "English",
                        "An astronaut stranded on Mars uses science and grit to survive until rescue arrives.",
                        "https://www.youtube.com/watch?v=ej3ioOneTy8",
                        "https://image.tmdb.org/t/p/w500/5aGhaIHYuQbqlHWvWYqMCnj40y2.jpg",
                        "https://image.tmdb.org/t/p/original/sy2A1oz89K4oIh4s2R5I1VY8Y4u.jpg",
                        SubscriptionPlan.BASIC),
                new MovieSeed("mvx-012", "Arrival", "Arrival", "Sci-Fi, Drama", 2016, 116, "PG-13",
                        "Denis Villeneuve", List.of("Amy Adams", "Jeremy Renner", "Forest Whitaker"), "English",
                        "A linguist is recruited to communicate with alien visitors before global conflict erupts.",
                        "https://www.youtube.com/watch?v=tFMo3UJ4B4g",
                        "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
                        "https://image.tmdb.org/t/p/original/yIZ1xendyqKvY3FGeeUYUd5X9Mm.jpg",
                        SubscriptionPlan.PREMIUM),
                new MovieSeed("mvx-013", "Everything Everywhere All at Once", "Everything Everywhere All at Once", "Sci-Fi, Comedy", 2022, 139, "R",
                        "Daniel Kwan, Daniel Scheinert", List.of("Michelle Yeoh", "Ke Huy Quan", "Stephanie Hsu"), "English",
                        "A woman is swept into a multiverse war where every version of her life matters.",
                        "https://www.youtube.com/watch?v=wxN1T1uxQ2g",
                        "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
                        "https://image.tmdb.org/t/p/original/ss0Os3uWJfQAENILHZUdX8Tt1OC.jpg",
                        SubscriptionPlan.STANDARD),
                new MovieSeed("mvx-014", "A Star Is Born", "A Star Is Born", "Romance, Drama", 2018, 136, "R",
                        "Bradley Cooper", List.of("Lady Gaga", "Bradley Cooper", "Sam Elliott"), "English",
                        "A seasoned musician helps a young singer find fame while their relationship is tested.",
                        "https://www.youtube.com/watch?v=nSbzyEJ8X9E",
                        "https://image.tmdb.org/t/p/w500/wrFpXMNBRj2PBiN4Z5kix51XaIZ.jpg",
                        "https://image.tmdb.org/t/p/original/840rbblaLc4SVxm8gF3DNdJ0YAE.jpg",
                        SubscriptionPlan.STANDARD),
                new MovieSeed("mvx-015", "Crazy Rich Asians", "Crazy Rich Asians", "Romance, Comedy", 2018, 120, "PG-13",
                        "Jon M. Chu", List.of("Constance Wu", "Henry Golding", "Michelle Yeoh"), "English",
                        "Rachel Chu is thrust into Singapore high society when meeting her boyfriend's family.",
                        "https://www.youtube.com/watch?v=ZQ-YX-5bAs0",
                        "https://image.tmdb.org/t/p/w500/1XxL4LJ5WHdrcYcihEZUCgNCpAW.jpg",
                        "https://image.tmdb.org/t/p/original/v3QyboWRoA4O9RbcsqH8tJMe8EB.jpg",
                        SubscriptionPlan.PREMIUM),
                new MovieSeed("mvx-016", "Past Lives", "Past Lives", "Romance, Drama", 2023, 106, "PG-13",
                        "Celine Song", List.of("Greta Lee", "Teo Yoo", "John Magaro"), "English",
                        "Two childhood friends reunite decades later and confront love, fate, and what-if choices.",
                        "https://www.youtube.com/watch?v=kA244xewjcI",
                        "https://image.tmdb.org/t/p/w500/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
                        "https://image.tmdb.org/t/p/original/gz8YGkGxf3aA4Ih1YGi7yVCWe6y.jpg",
                        SubscriptionPlan.STANDARD)
        );
    }

    private String normalizeTitle(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private record MovieSeed(String id,
                             String title,
                             String originalTitle,
                             String genre,
                             int year,
                             Integer runtimeMinutes,
                             String ageRating,
                             String director,
                             List<String> cast,
                             String language,
                             String description,
                             String trailerUrl,
                             String posterUrl,
                             String backdropUrl,
                             SubscriptionPlan plan) {
        private String normalizedTitle() {
            return title == null ? "" : title.trim().toLowerCase(Locale.ROOT);
        }
    }

    private record HallSeed(String cinemaId, String auditoriumId, int basePrice) {}
}
