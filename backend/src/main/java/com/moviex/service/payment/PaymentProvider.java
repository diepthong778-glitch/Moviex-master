package com.moviex.service.payment;

import com.moviex.model.PaymentProviderType;
import com.moviex.model.PaymentTransaction;

public interface PaymentProvider {
    PaymentProviderType getProviderType();
    PaymentTransaction initialize(PaymentTransaction transaction);
}
