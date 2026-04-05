package com.moviex.dto;

import com.moviex.model.PaymentMethod;
import com.moviex.model.SubscriptionPlan;

import java.math.BigDecimal;

public class PaymentCreateRequest {
    private SubscriptionPlan planType;
    private String packageId;
    private String movieId;
    private BigDecimal amount;
    private String currency;
    private PaymentMethod paymentMethod = PaymentMethod.QR;
    private String redirectPath;

    public PaymentCreateRequest() {}

    public SubscriptionPlan getPlanType() { return planType; }
    public void setPlanType(SubscriptionPlan planType) { this.planType = planType; }
    public String getPackageId() { return packageId; }
    public void setPackageId(String packageId) { this.packageId = packageId; }
    public String getMovieId() { return movieId; }
    public void setMovieId(String movieId) { this.movieId = movieId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getRedirectPath() { return redirectPath; }
    public void setRedirectPath(String redirectPath) { this.redirectPath = redirectPath; }
}
