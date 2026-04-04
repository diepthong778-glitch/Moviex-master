package com.moviex.dto;

import com.moviex.model.WalletTransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class WalletTransactionResponse {
    private String id;
    private String userId;
    private BigDecimal amount;
    private WalletTransactionType type;
    private LocalDateTime createdAt;

    public WalletTransactionResponse() {}

    public WalletTransactionResponse(String id, String userId, BigDecimal amount, WalletTransactionType type, LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.amount = amount;
        this.type = type;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public WalletTransactionType getType() { return type; }
    public void setType(WalletTransactionType type) { this.type = type; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
