package com.moviex.repository;

import com.moviex.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByVerificationToken(String verificationToken);
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);
    List<User> findByOnlineTrue();
    long countByOnlineTrue();
}
