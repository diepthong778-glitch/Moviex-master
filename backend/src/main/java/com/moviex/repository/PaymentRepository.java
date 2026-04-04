package com.moviex.repository;

import com.moviex.model.Payment;
import com.moviex.model.PaymentStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRepository extends MongoRepository<Payment, String> {
    List<Payment> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Payment> findByStatus(PaymentStatus status);
}
