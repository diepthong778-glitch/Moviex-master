package com.moviex.ai.service;

import com.moviex.dto.MovieDto;
import com.moviex.service.MovieService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class AiMovieAdapterService {
    private static final List<Set<String>> GENRE_GROUPS = List.of(
            Set.of("thriller", "giat gan", "hoi hop"),
            Set.of("action", "hanh dong"),
            Set.of("romance", "lang man", "tinh cam"),
            Set.of("drama", "tam ly"),
            Set.of("comedy", "hai"),
            Set.of("horror", "kinh di"),
            Set.of("sci-fi", "scifi", "khoa hoc vien tuong", "vien tuong"),
            Set.of("adventure", "phieu luu"),
            Set.of("mystery", "bi an")
    );

    private final MovieService movieService;

    public AiMovieAdapterService(MovieService movieService) {
        this.movieService = movieService;
    }

    public List<MovieDto> findRecommendedMovies(String message, int limit) {
        List<MovieDto> movies = movieService.getAllMovies();
        if (movies.isEmpty()) {
            return List.of();
        }

        String normalizedMessage = normalize(message);
        Set<String> matchedGenreTerms = detectGenreTerms(normalizedMessage);
        List<MovieScore> scored = new ArrayList<>();

        for (MovieDto movie : movies) {
            int score = 0;
            String genre = normalize(movie.getGenre());
            String title = normalize(movie.getTitle());
            String description = normalize(movie.getDescription());

            for (String genreTerm : matchedGenreTerms) {
                if (genre.contains(genreTerm)) {
                    score += 8;
                }
            }

            if (!matchedGenreTerms.isEmpty() && containsAny(description, matchedGenreTerms)) {
                score += 3;
            }

            if (!matchedGenreTerms.isEmpty() && containsAny(title, matchedGenreTerms)) {
                score += 2;
            }

            if (score == 0 && matchedGenreTerms.isEmpty()) {
                score = 1;
            }

            if (score > 0) {
                scored.add(new MovieScore(movie, score));
            }
        }

        return scored.stream()
                .sorted(Comparator
                        .comparingInt(MovieScore::score).reversed()
                        .thenComparing(item -> item.movie().getTitle(), String::compareToIgnoreCase))
                .map(MovieScore::movie)
                .limit(limit)
                .toList();
    }

    public List<MovieDto> listCatalogSample(int limit) {
        return movieService.searchMovies(null, null, null, PageRequest.of(0, Math.max(1, limit)))
                .getContent();
    }

    private Set<String> detectGenreTerms(String normalizedMessage) {
        Set<String> terms = new LinkedHashSet<>();
        for (Set<String> group : GENRE_GROUPS) {
            boolean matched = group.stream().anyMatch(normalizedMessage::contains);
            if (matched) {
                group.stream()
                        .filter(term -> !term.contains(" "))
                        .findFirst()
                        .ifPresent(terms::add);
            }
        }
        return terms;
    }

    private boolean containsAny(String haystack, Set<String> needles) {
        for (String needle : needles) {
            if (haystack.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private String normalize(String value) {
        String lower = String.valueOf(value == null ? "" : value).toLowerCase(Locale.ROOT);
        return Normalizer.normalize(lower, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private record MovieScore(MovieDto movie, int score) {
    }
}
