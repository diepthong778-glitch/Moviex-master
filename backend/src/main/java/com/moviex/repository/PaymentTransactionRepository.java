package com.moviex.repository;

import com.moviex.model.PaymentTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends MongoRepository<PaymentTransaction, String> {
    Optional<PaymentTransaction> findByTxnCode(String txnCode);
    List<PaymentTransaction> findByUserIdOrderByCreatedAtDesc(String userId);
}
