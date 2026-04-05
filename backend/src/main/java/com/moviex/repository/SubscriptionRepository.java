package com.moviex.repository;

import com.moviex.model.Subscription;
import com.moviex.model.SubscriptionStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Collection;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends MongoRepository<Subscription, String> {
    Optional<Subscription> findByUserId(String userId);
    List<Subscription> findByUserIdIn(Collection<String> userIds);
    List<Subscription> findByUserIdOrderByEndDateDesc(String userId);
    List<Subscription> findByStatus(SubscriptionStatus status);
    List<Subscription> findAllByOrderByCreatedAtDesc();
    long countByStatus(SubscriptionStatus status);
}
