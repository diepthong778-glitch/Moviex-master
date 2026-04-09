package com.moviex.config;

import com.moviex.model.Movie;
import com.moviex.repository.MovieRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.moviex.model.Role;
import com.moviex.model.SubscriptionPlan;
import com.moviex.model.User;
import com.moviex.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(MovieRepository movieRepository, UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {
            // Seed Users
            if (userRepository.count() == 0) {
                User admin = new User();
                admin.setEmail("admin@moviex.com");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRoles(Set.of(Role.ROLE_ADMIN, Role.ROLE_USER));
                admin.setVerified(true);
                admin.setSubscriptionPlan(SubscriptionPlan.PREMIUM);
                userRepository.save(admin);

                User user = new User();
                user.setEmail("user@moviex.com");
                user.setPassword(passwordEncoder.encode("user123"));
                user.setRoles(Set.of(Role.ROLE_USER));
                user.setVerified(true);
                user.setSubscriptionPlan(SubscriptionPlan.BASIC);
                userRepository.save(user);

                System.out.println("✅ Database seeded with Admin and Default User!");
            }

            syncMovies(movieRepository);
        };
    }

    private void syncMovies(MovieRepository movieRepository) {
        List<Movie> sampleMovies = buildSampleMovies();
        List<Movie> existingMovies = movieRepository.findAll();

        Map<String, Movie> existingByTitle = new HashMap<>();
        for (Movie existingMovie : existingMovies) {
            if (existingMovie.getTitle() != null) {
                existingByTitle.putIfAbsent(existingMovie.getTitle(), existingMovie);
            }
        }

        Set<String> sampleTitles = sampleMovies.stream()
                .map(Movie::getTitle)
                .collect(java.util.stream.Collectors.toSet());

        List<Movie> obsoleteMovies = existingMovies.stream()
                .filter(movie -> movie.getTitle() == null || !sampleTitles.contains(movie.getTitle()))
                .toList();

        boolean needsSync = existingMovies.size() != sampleMovies.size()
                || !obsoleteMovies.isEmpty()
                || sampleMovies.stream().anyMatch(sampleMovie -> !matchesSeed(existingByTitle.get(sampleMovie.getTitle()), sampleMovie));

        if (!needsSync) {
            System.out.println("ℹ️ Movie catalog already matches the seeded movies (" + sampleMovies.size() + ").");
            return;
        }

        List<Movie> moviesToSave = sampleMovies.stream()
                .map(sampleMovie -> {
                    Movie existingMovie = existingByTitle.get(sampleMovie.getTitle());
                    if (existingMovie != null) {
                        sampleMovie.setId(existingMovie.getId());
                        sampleMovie.setPosterUrl(existingMovie.getPosterUrl());
                        sampleMovie.setBackdropUrl(existingMovie.getBackdropUrl());
                        sampleMovie.setOriginalTitle(existingMovie.getOriginalTitle());
                        sampleMovie.setRuntimeMinutes(existingMovie.getRuntimeMinutes());
                        sampleMovie.setAgeRating(existingMovie.getAgeRating());
                        sampleMovie.setDirector(existingMovie.getDirector());
                        sampleMovie.setCast(existingMovie.getCast());
                        sampleMovie.setLanguage(existingMovie.getLanguage());
                    }
                    return sampleMovie;
                })
                .toList();

        if (!obsoleteMovies.isEmpty()) {
            movieRepository.deleteAll(obsoleteMovies);
        }

        movieRepository.saveAll(moviesToSave);
        System.out.println("✅ Movie catalog synchronized to " + sampleMovies.size() + " seeded movies.");
    }

    private boolean matchesSeed(Movie existingMovie, Movie sampleMovie) {
        if (existingMovie == null) {
            return false;
        }

        return sampleMovie.getGenre().equals(existingMovie.getGenre())
                && sampleMovie.getYear() == existingMovie.getYear()
                && sampleMovie.getDescription().equals(existingMovie.getDescription())
                && Objects.equals(sampleMovie.getVideoUrl(), existingMovie.getVideoUrl())
                && Objects.equals(sampleMovie.getTrailerUrl(), existingMovie.getTrailerUrl())
                && sampleMovie.getRequiredSubscription() == existingMovie.getRequiredSubscription();
    }

    private List<Movie> buildSampleMovies() {
        final String videoUrl = null; // Direction A: play trailers from YouTube (trailerUrl).

        return List.of(
                new Movie(null, "La La Land", "Romance", 2016,
                        "In Los Angeles, aspiring actress Mia and jazz pianist Sebastian fall in love while chasing careers that keep pulling them in different directions. Their romance deepens through music and ambition, then fractures as each chooses a different path to the future.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=0pdqf4P9MB8",
                        SubscriptionPlan.BASIC),
                new Movie(null, "A Star Is Born", "Romance", 2018,
                        "Seasoned musician Jackson Maine discovers Ally, a gifted singer-songwriter, and helps launch her career. As Ally rises to fame, their love story is tested by fame, insecurity, and Jackson's struggles with addiction.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=nSbzyEJ8X9E",
                        SubscriptionPlan.STANDARD),
                new Movie(null, "Crazy Rich Asians", "Romance", 2018,
                        "Rachel Chu travels to Singapore with her boyfriend Nick and learns he comes from one of the wealthiest families in Asia. Between social pressure, family expectations, and old money politics, she must decide whether their relationship can survive the spotlight.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=ZQ-YX-5bAs0",
                        SubscriptionPlan.PREMIUM),
                new Movie(null, "Past Lives", "Romance", 2023,
                        "Nora reunites in New York with Hae Sung, the childhood friend she left behind in South Korea. Over a few days together, they confront what destiny means, what immigration cost them, and what kind of love can survive across time.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=kA244xewjcI",
                        SubscriptionPlan.STANDARD),

                new Movie(null, "John Wick: Chapter 4", "Action", 2023,
                        "John Wick fights his way through the High Table's global network in a final bid for freedom. Each duel raises the stakes as new assassins and old loyalties close in from Osaka to Paris.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=qEVUtrk8_B4",
                        SubscriptionPlan.PREMIUM),
                new Movie(null, "Top Gun: Maverick", "Action", 2022,
                        "After decades as a Navy pilot, Maverick trains a new generation for a near-impossible mission. Facing advanced enemy defenses and the son of his late friend Goose, he must lead from the front one more time.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=giXco2jaZ_4",
                        SubscriptionPlan.PREMIUM),
                new Movie(null, "Mission: Impossible - Dead Reckoning Part One", "Action", 2023,
                        "Ethan Hunt and his IMF team race to control a rogue AI known as the Entity before it destabilizes global security. The mission takes them through deadly pursuits, impossible stunts, and betrayals on multiple fronts.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=avz06PDqDbM",
                        SubscriptionPlan.STANDARD),
                new Movie(null, "Mad Max: Fury Road", "Action", 2015,
                        "Max teams up with Imperator Furiosa in a high-speed escape across a post-apocalyptic desert. Chased by the warlord Immortan Joe, their convoy battle becomes a revolt against tyranny and resource control.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=hEJnMQG9ev8",
                        SubscriptionPlan.STANDARD),

                new Movie(null, "It", "Horror", 2017,
                        "In Derry, a group of children called the Losers Club face an ancient evil that appears as Pennywise the Dancing Clown. The shape-shifting entity feeds on fear, forcing them to confront both supernatural terror and real-world trauma.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=xKJmEC5ieOk",
                        SubscriptionPlan.STANDARD),
                new Movie(null, "A Quiet Place", "Horror", 2018,
                        "The Abbott family lives in silence to survive creatures that hunt by sound. Every step, breath, and whisper becomes life-or-death as they protect their children in a world where noise kills.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=WR7cc5t7tv8",
                        SubscriptionPlan.PREMIUM),
                new Movie(null, "Hereditary", "Horror", 2018,
                        "After the family matriarch dies, Annie and her children uncover disturbing secrets about their lineage. Grief spirals into possession and ritual horror as they realize something has been carefully waiting for them.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=V6wWKNij_1M",
                        SubscriptionPlan.BASIC),
                new Movie(null, "Talk to Me", "Horror", 2023,
                        "Teenagers discover they can contact spirits by holding an embalmed hand and reciting a ritual phrase. What starts as a thrill game turns deadly when one of them opens the door for too long.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=aLAKJu9aJys",
                        SubscriptionPlan.STANDARD),

                new Movie(null, "Dune", "Sci-Fi", 2021,
                        "Paul Atreides travels to Arrakis, the desert planet that produces the universe's most valuable resource, spice. As political betrayal and prophecy collide, he is pushed toward a destiny tied to the Fremen and the future of the Imperium.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=n9xhJrPXop4",
                        SubscriptionPlan.PREMIUM),
                new Movie(null, "Blade Runner 2049", "Sci-Fi", 2017,
                        "Officer K, a replicant blade runner, uncovers a secret that threatens the fragile order between humans and replicants. His investigation leads him to Rick Deckard and a mystery buried for decades.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=gCcx85zbxz4",
                        SubscriptionPlan.STANDARD),
                new Movie(null, "The Martian", "Sci-Fi", 2015,
                        "Astronaut Mark Watney is stranded on Mars after his crew believes he has died in a storm. Using science, humor, and relentless problem-solving, he fights to survive while NASA plans a risky rescue.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=ej3ioOneTy8",
                        SubscriptionPlan.BASIC),
                new Movie(null, "Arrival", "Sci-Fi", 2016,
                        "Linguist Louise Banks is recruited when twelve alien ships appear around the world. As she deciphers their language, she discovers that communication itself can alter how humans perceive time and fate.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=tFMo3UJ4B4g",
                        SubscriptionPlan.PREMIUM),
                new Movie(null, "Everything Everywhere All at Once", "Sci-Fi", 2022,
                        "Evelyn Wang, a struggling laundromat owner, is pulled into a multiverse conflict during an IRS audit. She must connect with alternate versions of herself to stop a reality-ending threat and repair her family relationships.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=wxN1T1uxQ2g",
                        SubscriptionPlan.STANDARD),

                new Movie(null, "Free Guy", "Comedy", 2021,
                        "Guy, a bank teller in an open-world video game, realizes he is a non-player character. He decides to rewrite his role and becomes an unexpected hero inside a chaotic digital universe.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=X2m-08cOAbc",
                        SubscriptionPlan.BASIC),
                new Movie(null, "The Nice Guys", "Comedy", 2016,
                        "In 1970s Los Angeles, a private investigator and a hired enforcer team up to solve the disappearance of a teenage girl. Their mismatched style and constant bickering hide a conspiracy tied to politics and the auto industry.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=GQR5zsLHbYw",
                        SubscriptionPlan.STANDARD),
                new Movie(null, "Game Night", "Comedy", 2018,
                        "A group of friends who love game night get caught in a real criminal kidnapping. What starts as roleplay turns into escalating chaos as they try to separate clues from actual danger.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=qmxMAdV6s4U",
                        SubscriptionPlan.BASIC),
                new Movie(null, "Ticket to Paradise", "Comedy", 2022,
                        "Divorced parents David and Georgia travel to Bali when their daughter announces a sudden wedding. Determined to stop her from repeating their mistakes, they sabotage the ceremony while rediscovering what once worked between them.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=hkP4tVTdsz8",
                        SubscriptionPlan.PREMIUM),

                new Movie(null, "Oppenheimer", "Drama", 2023,
                        "J. Robert Oppenheimer leads the Manhattan Project and helps create the atomic bomb during World War II. The film follows his scientific achievement, political scrutiny, and moral reckoning with the consequences of nuclear power.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=uYPbbksJxIg",
                        SubscriptionPlan.PREMIUM),
                new Movie(null, "The Fabelmans", "Drama", 2022,
                        "Sammy Fabelman discovers a passion for filmmaking while growing up in postwar America. Through family moves and a painful household rupture, cinema becomes his way of understanding truth and memory.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=D1G2iLSzOe8",
                        SubscriptionPlan.STANDARD),
                new Movie(null, "Nomadland", "Drama", 2020,
                        "After losing her job and home, Fern lives on the road in a van across the American West. Her journey through seasonal work and temporary communities becomes a portrait of grief, resilience, and chosen belonging.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=6sxCFZ8_d84",
                        SubscriptionPlan.BASIC),
                new Movie(null, "Manchester by the Sea", "Drama", 2016,
                        "Lee Chandler returns to his hometown after his brother's death and is named guardian of his teenage nephew. As he handles legal responsibilities, unresolved grief forces him to confront the tragedy that broke his past life.",
                        videoUrl,
                        "https://www.youtube.com/watch?v=gsVoD0pTge0",
                        SubscriptionPlan.STANDARD));
    }
}
