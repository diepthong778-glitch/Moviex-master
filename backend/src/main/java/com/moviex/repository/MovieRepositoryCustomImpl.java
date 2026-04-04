package com.moviex.repository;

import com.moviex.model.Movie;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class MovieRepositoryCustomImpl implements MovieRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    public MovieRepositoryCustomImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public Page<Movie> searchMovies(String title, String genre, Integer year, Pageable pageable) {
        Query query = new Query();

        if (title != null && !title.trim().isEmpty()) {
            query.addCriteria(Criteria.where("title").regex(title.trim(), "i"));
        }

        if (genre != null && !genre.trim().isEmpty()) {
            query.addCriteria(Criteria.where("genre").is(genre.trim()));
        }

        if (year != null) {
            query.addCriteria(Criteria.where("year").is(year));
        }

        long total = mongoTemplate.count(query, Movie.class);

        query.with(pageable);

        List<Movie> movies = mongoTemplate.find(query, Movie.class);

        return new PageImpl<>(movies, pageable, total);
    }
}
