package com.moviex.dto;

import java.math.BigDecimal;

public class WalletResponse {
    private String userId;
    private BigDecimal balance;

    public WalletResponse() {}

    public WalletResponse(String userId, BigDecimal balance) {
        this.userId = userId;
        this.balance = balance;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
}
