package com.moviex.repository;

import com.moviex.model.WalletTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WalletTransactionRepository extends MongoRepository<WalletTransaction, String> {
    List<WalletTransaction> findByUserIdOrderByCreatedAtDesc(String userId);
}
