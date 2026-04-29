package com.moviex.cinema.repository;

import com.moviex.cinema.model.PaymentTransaction;
import com.moviex.cinema.model.CinemaPaymentStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CinemaPaymentTransactionRepository extends MongoRepository<PaymentTransaction, String> {
    Optional<PaymentTransaction> findByTxnCode(String txnCode);
    Optional<PaymentTransaction> findByBookingIdAndStatus(String bookingId, CinemaPaymentStatus status);
    List<PaymentTransaction> findByBookingIdInOrderByCreatedAtDesc(List<String> bookingIds);
    List<PaymentTransaction> findAllByOrderByCreatedAtDesc();
}
