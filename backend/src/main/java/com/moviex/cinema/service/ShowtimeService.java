package com.moviex.cinema.service;

import com.moviex.cinema.dto.CreateShowtimeRequest;
import com.moviex.cinema.dto.ShowtimeViewResponse;
import com.moviex.cinema.model.Auditorium;
import com.moviex.cinema.model.Cinema;
import com.moviex.cinema.model.MovieShowtime;
import com.moviex.cinema.model.ShowtimeStatus;
import com.moviex.cinema.repository.AuditoriumRepository;
import com.moviex.cinema.repository.CinemaRepository;
import com.moviex.cinema.repository.MovieShowtimeRepository;
import com.moviex.model.Movie;
import com.moviex.repository.MovieRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ShowtimeService {
    private static final Map<String, DemoMovieMeta> DEMO_MOVIES = Map.ofEntries(
            Map.entry("mvx-001", new DemoMovieMeta(
                    "La La Land",
                    "La La Land",
                    "Romance, Drama",
                    2016,
                    128,
                    "PG-13",
                    "Damien Chazelle",
                    List.of("Ryan Gosling", "Emma Stone", "John Legend"),
                    "English",
                    "A jazz pianist and an aspiring actress fall in love while chasing their dreams in Los Angeles.",
                    "https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
                    "https://image.tmdb.org/t/p/original/nAOWM9PUJdCByx9f5jR7I7M0QxJ.jpg")),
            Map.entry("mvx-002", new DemoMovieMeta(
                    "John Wick: Chapter 4",
                    "John Wick: Chapter 4",
                    "Action, Thriller",
                    2023,
                    169,
                    "R",
                    "Chad Stahelski",
                    List.of("Keanu Reeves", "Donnie Yen", "Bill Skarsgard"),
                    "English",
                    "John Wick battles the High Table in a relentless global fight for freedom.",
                    "https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg",
                    "https://image.tmdb.org/t/p/original/7I6VUdPj6tQECNHdviJkUHD2u89.jpg")),
            Map.entry("mvx-003", new DemoMovieMeta(
                    "Dune",
                    "Dune",
                    "Sci-Fi, Adventure",
                    2021,
                    155,
                    "PG-13",
                    "Denis Villeneuve",
                    List.of("Timothee Chalamet", "Rebecca Ferguson", "Zendaya"),
                    "English",
                    "Paul Atreides arrives on Arrakis and is drawn into a destiny that can reshape the universe.",
                    "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
                    "https://image.tmdb.org/t/p/original/iopYFB1b6Bh7FWZh3onQhph1sih.jpg")),
            Map.entry("mvx-004", new DemoMovieMeta(
                    "Free Guy",
                    "Free Guy",
                    "Comedy, Action",
                    2021,
                    115,
                    "PG-13",
                    "Shawn Levy",
                    List.of("Ryan Reynolds", "Jodie Comer", "Joe Keery"),
                    "English",
                    "A video game NPC discovers his world is fake and decides to become a hero.",
                    "https://image.tmdb.org/t/p/w500/xmbU4JTUm8rsdtn7Y3Fcm30GpeT.jpg",
                    "https://image.tmdb.org/t/p/original/j28p5VwI5ieZnNwfeuZ5Ve3mPsn.jpg")),
            Map.entry("mvx-005", new DemoMovieMeta(
                    "Oppenheimer",
                    "Oppenheimer",
                    "Drama, History",
                    2023,
                    180,
                    "R",
                    "Christopher Nolan",
                    List.of("Cillian Murphy", "Emily Blunt", "Robert Downey Jr."),
                    "English",
                    "The story of J. Robert Oppenheimer and the creation of the atomic bomb.",
                    "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
                    "https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg")),
            Map.entry("mvx-006", new DemoMovieMeta(
                    "A Quiet Place",
                    "A Quiet Place",
                    "Horror, Thriller",
                    2018,
                    90,
                    "PG-13",
                    "John Krasinski",
                    List.of("Emily Blunt", "John Krasinski", "Millicent Simmonds"),
                    "English",
                    "A family survives in near silence in a world where sound attracts deadly creatures.",
                    "https://image.tmdb.org/t/p/w500/nAU74GmpUk7t5iklEp3bufwDq4n.jpg",
                    "https://image.tmdb.org/t/p/original/roYyPiQDQKmIKUEhO912693tSja.jpg")),
            Map.entry("mvx-007", new DemoMovieMeta(
                    "Top Gun: Maverick",
                    "Top Gun: Maverick",
                    "Action, Drama",
                    2022,
                    131,
                    "PG-13",
                    "Joseph Kosinski",
                    List.of("Tom Cruise", "Miles Teller", "Jennifer Connelly"),
                    "English",
                    "Veteran pilot Maverick returns to train a new generation for a high-risk mission.",
                    "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
                    "https://image.tmdb.org/t/p/original/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg")),
            Map.entry("mvx-008", new DemoMovieMeta(
                    "Mission: Impossible - Dead Reckoning Part One",
                    "Mission: Impossible - Dead Reckoning Part One",
                    "Action, Spy",
                    2023,
                    163,
                    "PG-13",
                    "Christopher McQuarrie",
                    List.of("Tom Cruise", "Hayley Atwell", "Ving Rhames"),
                    "English",
                    "Ethan Hunt and his IMF team race to stop a rogue AI from destabilizing global security.",
                    "https://image.tmdb.org/t/p/w500/NNxYkU70HPurnNCSiCjYAmacwm.jpg",
                    "https://image.tmdb.org/t/p/original/628Dep6AxEtDxjZoGP78TsOxYbK.jpg")),
            Map.entry("mvx-009", new DemoMovieMeta(
                    "Mad Max: Fury Road",
                    "Mad Max: Fury Road",
                    "Action, Adventure",
                    2015,
                    120,
                    "R",
                    "George Miller",
                    List.of("Tom Hardy", "Charlize Theron", "Nicholas Hoult"),
                    "English",
                    "Max teams up with Furiosa in a high-speed revolt across a brutal desert wasteland.",
                    "https://image.tmdb.org/t/p/w500/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
                    "https://image.tmdb.org/t/p/original/kqjL17yufvn9OVLyXYpvtyrFfak.jpg")),
            Map.entry("mvx-010", new DemoMovieMeta(
                    "Blade Runner 2049",
                    "Blade Runner 2049",
                    "Sci-Fi, Mystery",
                    2017,
                    164,
                    "R",
                    "Denis Villeneuve",
                    List.of("Ryan Gosling", "Harrison Ford", "Ana de Armas"),
                    "English",
                    "A replicant blade runner uncovers a secret that could change humanity forever.",
                    "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
                    "https://image.tmdb.org/t/p/original/iFfxCkHnNS8GXvjL8b9bA0bU8aS.jpg")),
            Map.entry("mvx-011", new DemoMovieMeta(
                    "The Martian",
                    "The Martian",
                    "Sci-Fi, Adventure",
                    2015,
                    144,
                    "PG-13",
                    "Ridley Scott",
                    List.of("Matt Damon", "Jessica Chastain", "Chiwetel Ejiofor"),
                    "English",
                    "An astronaut stranded on Mars uses science and grit to survive until rescue arrives.",
                    "https://image.tmdb.org/t/p/w500/5aGhaIHYuQbqlHWvWYqMCnj40y2.jpg",
                    "https://image.tmdb.org/t/p/original/sy2A1oz89K4oIh4s2R5I1VY8Y4u.jpg")),
            Map.entry("mvx-012", new DemoMovieMeta(
                    "Arrival",
                    "Arrival",
                    "Sci-Fi, Drama",
                    2016,
                    116,
                    "PG-13",
                    "Denis Villeneuve",
                    List.of("Amy Adams", "Jeremy Renner", "Forest Whitaker"),
                    "English",
                    "A linguist is recruited to communicate with alien visitors before global conflict erupts.",
                    "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
                    "https://image.tmdb.org/t/p/original/yIZ1xendyqKvY3FGeeUYUd5X9Mm.jpg")),
            Map.entry("mvx-013", new DemoMovieMeta(
                    "Everything Everywhere All at Once",
                    "Everything Everywhere All at Once",
                    "Sci-Fi, Comedy",
                    2022,
                    139,
                    "R",
                    "Daniel Kwan, Daniel Scheinert",
                    List.of("Michelle Yeoh", "Ke Huy Quan", "Stephanie Hsu"),
                    "English",
                    "A woman is swept into a multiverse war where every version of her life matters.",
                    "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
                    "https://image.tmdb.org/t/p/original/ss0Os3uWJfQAENILHZUdX8Tt1OC.jpg")),
            Map.entry("mvx-014", new DemoMovieMeta(
                    "A Star Is Born",
                    "A Star Is Born",
                    "Romance, Drama",
                    2018,
                    136,
                    "R",
                    "Bradley Cooper",
                    List.of("Lady Gaga", "Bradley Cooper", "Sam Elliott"),
                    "English",
                    "A seasoned musician helps a young singer find fame while their relationship is tested.",
                    "https://image.tmdb.org/t/p/w500/wrFpXMNBRj2PBiN4Z5kix51XaIZ.jpg",
                    "https://image.tmdb.org/t/p/original/840rbblaLc4SVxm8gF3DNdJ0YAE.jpg")),
            Map.entry("mvx-015", new DemoMovieMeta(
                    "Crazy Rich Asians",
                    "Crazy Rich Asians",
                    "Romance, Comedy",
                    2018,
                    120,
                    "PG-13",
                    "Jon M. Chu",
                    List.of("Constance Wu", "Henry Golding", "Michelle Yeoh"),
                    "English",
                    "Rachel Chu is thrust into Singapore high society when meeting her boyfriend's family.",
                    "https://image.tmdb.org/t/p/w500/1XxL4LJ5WHdrcYcihEZUCgNCpAW.jpg",
                    "https://image.tmdb.org/t/p/original/v3QyboWRoA4O9RbcsqH8tJMe8EB.jpg")),
            Map.entry("mvx-016", new DemoMovieMeta(
                    "Past Lives",
                    "Past Lives",
                    "Romance, Drama",
                    2023,
                    106,
                    "PG-13",
                    "Celine Song",
                    List.of("Greta Lee", "Teo Yoo", "John Magaro"),
                    "English",
                    "Two childhood friends reunite decades later and confront love, fate, and what-if choices.",
                    "https://image.tmdb.org/t/p/w500/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
                    "https://image.tmdb.org/t/p/original/gz8YGkGxf3aA4Ih1YGi7yVCWe6y.jpg"))
    );

    private static final Map<String, DemoMovieMeta> DEMO_MOVIES_BY_TITLE = DEMO_MOVIES.values().stream()
            .collect(Collectors.toMap(
                    meta -> normalizeKey(meta.title()),
                    Function.identity(),
                    (left, right) -> left,
                    LinkedHashMap::new
            ));

    private final MovieShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final CinemaRepository cinemaRepository;
    private final AuditoriumRepository auditoriumRepository;

    public ShowtimeService(MovieShowtimeRepository showtimeRepository,
                           MovieRepository movieRepository,
                           CinemaRepository cinemaRepository,
                           AuditoriumRepository auditoriumRepository) {
        this.showtimeRepository = showtimeRepository;
        this.movieRepository = movieRepository;
        this.cinemaRepository = cinemaRepository;
        this.auditoriumRepository = auditoriumRepository;
    }

    public MovieShowtime createShowtime(CreateShowtimeRequest request) {
        if (request.getMovieId() == null || request.getMovieId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "movieId is required");
        }
        if (request.getCinemaId() == null || request.getCinemaId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "cinemaId is required");
        }
        if (request.getAuditoriumId() == null || request.getAuditoriumId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "auditoriumId is required");
        }

        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Movie not found"));
        cinemaRepository.findById(request.getCinemaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cinema not found"));
        auditoriumRepository.findById(request.getAuditoriumId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Auditorium not found"));

        MovieShowtime showtime = new MovieShowtime();
        showtime.setMovieId(movie.getId());
        showtime.setCinemaId(request.getCinemaId());
        showtime.setAuditoriumId(request.getAuditoriumId());
        showtime.setShowDate(request.getShowDate());
        showtime.setStartTime(request.getStartTime());
        showtime.setEndTime(request.getEndTime());
        showtime.setBasePrice(request.getBasePrice() == null ? BigDecimal.ZERO : request.getBasePrice());
        showtime.setStatus(ShowtimeStatus.SCHEDULED);
        showtime.setCreatedAt(LocalDateTime.now());
        showtime.setUpdatedAt(LocalDateTime.now());
        return showtimeRepository.save(showtime);
    }

    public List<MovieShowtime> listShowtimes(String cinemaId,
                                             String movieId,
                                             String auditoriumId,
                                             LocalDate showDate,
                                             DayOfWeek dayOfWeek) {
        return showtimeRepository.findAll().stream()
                .filter(showtime -> cinemaId == null || cinemaId.equals(showtime.getCinemaId()))
                .filter(showtime -> movieId == null || movieId.equals(showtime.getMovieId()))
                .filter(showtime -> auditoriumId == null || auditoriumId.equals(showtime.getAuditoriumId()))
                .filter(showtime -> showDate == null || showDate.equals(showtime.getShowDate()))
                .filter(showtime -> dayOfWeek == null
                        || (showtime.getShowDate() != null && dayOfWeek.equals(showtime.getShowDate().getDayOfWeek())))
                .sorted(Comparator
                        .comparing(MovieShowtime::getShowDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(MovieShowtime::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    public MovieShowtime getShowtime(String id) {
        return showtimeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Showtime not found"));
    }

    public List<ShowtimeViewResponse> listShowtimeViews(String cinemaId,
                                                        String movieId,
                                                        String auditoriumId,
                                                        LocalDate showDate,
                                                        DayOfWeek dayOfWeek) {
        List<MovieShowtime> showtimes = listShowtimes(cinemaId, movieId, auditoriumId, showDate, dayOfWeek).stream()
                .filter(showtime -> showtime.getStatus() == null || showtime.getStatus() == ShowtimeStatus.SCHEDULED)
                .toList();
        return toShowtimeViews(showtimes);
    }

    public ShowtimeViewResponse getShowtimeView(String id) {
        MovieShowtime showtime = getShowtime(id);
        return toShowtimeViews(List.of(showtime)).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Showtime not found"));
    }

    public DayOfWeek parseDayOfWeek(String rawValue) {
        if (rawValue == null || rawValue.trim().isEmpty()) {
            return null;
        }
        try {
            return DayOfWeek.valueOf(rawValue.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid dayOfWeek. Use MONDAY..SUNDAY");
        }
    }

    private List<ShowtimeViewResponse> toShowtimeViews(List<MovieShowtime> showtimes) {
        Map<String, Cinema> cinemaById = cinemaRepository.findAllById(showtimes.stream()
                        .map(MovieShowtime::getCinemaId)
                        .filter(value -> value != null && !value.isBlank())
                        .collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(Cinema::getId, Function.identity()));

        Map<String, Auditorium> auditoriumById = auditoriumRepository.findAllById(showtimes.stream()
                        .map(MovieShowtime::getAuditoriumId)
                        .filter(value -> value != null && !value.isBlank())
                        .collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(Auditorium::getId, Function.identity()));

        Map<String, Movie> movieById = movieRepository.findAllById(showtimes.stream()
                        .map(MovieShowtime::getMovieId)
                        .filter(value -> value != null && !value.isBlank())
                        .collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(Movie::getId, Function.identity()));

        return showtimes.stream().map(showtime -> {
            ShowtimeViewResponse response = new ShowtimeViewResponse();
            response.setId(showtime.getId());
            response.setMovieId(showtime.getMovieId());
            response.setCinemaId(showtime.getCinemaId());
            response.setAuditoriumId(showtime.getAuditoriumId());
            response.setShowDate(showtime.getShowDate());
            response.setDayOfWeek(showtime.getShowDate() == null ? null : showtime.getShowDate().getDayOfWeek());
            response.setStartTime(showtime.getStartTime());
            response.setEndTime(showtime.getEndTime());
            response.setBasePrice(showtime.getBasePrice());
            response.setStatus(showtime.getStatus());

            Cinema cinema = cinemaById.get(showtime.getCinemaId());
            response.setCinemaName(cinema != null ? cinema.getName() : null);
            response.setCinemaCity(cinema != null ? cinema.getCity() : null);

            Auditorium auditorium = auditoriumById.get(showtime.getAuditoriumId());
            response.setAuditoriumName(auditorium != null ? auditorium.getName() : null);

            Movie movie = movieById.get(showtime.getMovieId());
            DemoMovieMeta demoMeta = resolveDemoMeta(showtime.getMovieId(), movie == null ? null : movie.getTitle());

            if (movie != null) {
                response.setMovieTitle(firstNonBlank(movie.getTitle(), demoMeta == null ? null : demoMeta.title()));
                response.setMovieOriginalTitle(firstNonBlank(movie.getOriginalTitle(), response.getMovieTitle()));
                response.setMovieGenre(firstNonBlank(movie.getGenre(), demoMeta == null ? null : demoMeta.genre()));
                response.setMovieReleaseYear(movie.getYear() > 0 ? movie.getYear() : demoMeta == null ? null : demoMeta.releaseYear());
                response.setMovieAgeRating(firstNonBlank(movie.getAgeRating(), demoMeta == null ? null : demoMeta.ageRating()));
                response.setMovieDirector(firstNonBlank(movie.getDirector(), demoMeta == null ? null : demoMeta.director()));
                response.setMovieCast((movie.getCast() != null && !movie.getCast().isEmpty())
                        ? movie.getCast()
                        : (demoMeta == null ? null : demoMeta.cast()));
                response.setMovieLanguage(firstNonBlank(movie.getLanguage(), demoMeta == null ? null : demoMeta.language()));
                response.setMovieSynopsis(firstNonBlank(movie.getDescription(), demoMeta == null ? null : demoMeta.synopsis()));
                response.setPosterUrl(firstNonBlank(movie.getPosterUrl(), demoMeta == null ? null : demoMeta.posterUrl()));
                response.setBackdropUrl(firstNonBlank(
                        movie.getBackdropUrl(),
                        firstNonBlank(
                                demoMeta == null ? null : demoMeta.backdropUrl(),
                                response.getPosterUrl()
                        )
                ));
            } else if (demoMeta != null) {
                response.setMovieTitle(demoMeta.title());
                response.setMovieOriginalTitle(demoMeta.originalTitle());
                response.setMovieGenre(demoMeta.genre());
                response.setMovieReleaseYear(demoMeta.releaseYear());
                response.setMovieAgeRating(demoMeta.ageRating());
                response.setMovieDirector(demoMeta.director());
                response.setMovieCast(demoMeta.cast());
                response.setMovieLanguage(demoMeta.language());
                response.setMovieSynopsis(demoMeta.synopsis());
                response.setPosterUrl(demoMeta.posterUrl());
                response.setBackdropUrl(demoMeta.backdropUrl());
            } else {
                response.setMovieTitle(showtime.getMovieId());
            }

            Integer duration = resolveDurationMinutes(showtime, movie, demoMeta);
            response.setDurationMinutes(duration);
            return response;
        }).toList();
    }

    private Integer resolveDurationMinutes(MovieShowtime showtime, Movie movie, DemoMovieMeta demoMeta) {
        LocalTime start = showtime.getStartTime();
        LocalTime end = showtime.getEndTime();
        if (start != null && end != null) {
            long minutes = ChronoUnit.MINUTES.between(start, end);
            if (minutes <= 0) {
                minutes += 24 * 60;
            }
            if (minutes > 0) {
                return (int) minutes;
            }
        }
        if (movie != null && movie.getRuntimeMinutes() != null && movie.getRuntimeMinutes() > 0) {
            return movie.getRuntimeMinutes();
        }
        return Optional.ofNullable(demoMeta).map(DemoMovieMeta::durationMinutes).orElse(null);
    }

    private String firstNonBlank(String preferred, String fallback) {
        if (preferred != null && !preferred.isBlank()) {
            return preferred;
        }
        return fallback;
    }

    private DemoMovieMeta resolveDemoMeta(String movieId, String movieTitle) {
        DemoMovieMeta byId = DEMO_MOVIES.get(movieId);
        if (byId != null) {
            return byId;
        }
        if (movieTitle == null || movieTitle.isBlank()) {
            return null;
        }
        return DEMO_MOVIES_BY_TITLE.get(normalizeKey(movieTitle));
    }

    private static String normalizeKey(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private record DemoMovieMeta(String title,
                                 String originalTitle,
                                 String genre,
                                 Integer releaseYear,
                                 Integer durationMinutes,
                                 String ageRating,
                                 String director,
                                 List<String> cast,
                                 String language,
                                 String synopsis,
                                 String posterUrl,
                                 String backdropUrl) {}
}
