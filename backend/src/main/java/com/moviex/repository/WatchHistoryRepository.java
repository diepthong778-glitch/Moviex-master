package com.moviex.repository;

import com.moviex.model.WatchHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WatchHistoryRepository extends MongoRepository<WatchHistory, String> {
    List<WatchHistory> findAllByUserIdAndMovieId(String userId, String movieId);
    List<WatchHistory> findAllByUserId(String userId);
    long deleteByUserIdAndMovieId(String userId, String movieId);
    List<WatchHistory> findByUserIdOrderByWatchedAtDesc(String userId);
    List<WatchHistory> findByUserIdOrderByWatchedAtDesc(String userId, Pageable pageable);
    List<WatchHistory> findAllByOrderByWatchedAtDesc();
    List<WatchHistory> findAllByOrderByWatchedAtDesc(Pageable pageable);
}
