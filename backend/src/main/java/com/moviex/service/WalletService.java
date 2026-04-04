package com.moviex.service;

import com.moviex.dto.DepositRequest;
import com.moviex.dto.WalletResponse;
import com.moviex.dto.WalletTransactionResponse;

import java.util.List;

public interface WalletService {
    WalletResponse getWallet();
    WalletResponse deposit(DepositRequest request);
    List<WalletTransactionResponse> getTransactions();
}
