package com.moviex.dto;

import com.moviex.model.PaymentMethod;
import com.moviex.model.SubscriptionPlan;

import java.math.BigDecimal;

public class PaymentCreateRequest {
    private SubscriptionPlan planType;
    private BigDecimal amount;
    private PaymentMethod paymentMethod = PaymentMethod.QR;

    public PaymentCreateRequest() {}

    public SubscriptionPlan getPlanType() { return planType; }
    public void setPlanType(SubscriptionPlan planType) { this.planType = planType; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
}
