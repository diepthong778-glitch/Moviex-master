package com.moviex.cinema.repository;

import com.moviex.cinema.model.PaymentTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface CinemaPaymentTransactionRepository extends MongoRepository<PaymentTransaction, String> {
    Optional<PaymentTransaction> findByTxnCode(String txnCode);
}
