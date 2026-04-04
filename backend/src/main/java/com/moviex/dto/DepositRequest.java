package com.moviex.dto;

import java.math.BigDecimal;

public class DepositRequest {
    private BigDecimal amount;

    public DepositRequest() {}

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}
