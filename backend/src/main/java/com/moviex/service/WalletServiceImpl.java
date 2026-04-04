package com.moviex.service;

import com.moviex.dto.DepositRequest;
import com.moviex.dto.WalletResponse;
import com.moviex.dto.WalletTransactionResponse;
import com.moviex.model.Wallet;
import com.moviex.model.WalletTransaction;
import com.moviex.model.WalletTransactionType;
import com.moviex.repository.WalletRepository;
import com.moviex.repository.WalletTransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class WalletServiceImpl implements WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final CurrentUserService currentUserService;

    public WalletServiceImpl(WalletRepository walletRepository,
                             WalletTransactionRepository walletTransactionRepository,
                             CurrentUserService currentUserService) {
        this.walletRepository = walletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.currentUserService = currentUserService;
    }

    @Override
    public WalletResponse getWallet() {
        Wallet wallet = getOrCreateWallet();
        return new WalletResponse(wallet.getUserId(), wallet.getBalance());
    }

    @Override
    public WalletResponse deposit(DepositRequest request) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "amount must be greater than 0");
        }

        Wallet wallet = getOrCreateWallet();
        wallet.setBalance(wallet.getBalance().add(request.getAmount()));
        walletRepository.save(wallet);

        WalletTransaction transaction = new WalletTransaction();
        transaction.setUserId(wallet.getUserId());
        transaction.setAmount(request.getAmount());
        transaction.setType(WalletTransactionType.DEPOSIT);
        transaction.setCreatedAt(LocalDateTime.now());
        walletTransactionRepository.save(transaction);

        return new WalletResponse(wallet.getUserId(), wallet.getBalance());
    }

    @Override
    public List<WalletTransactionResponse> getTransactions() {
        String userId = currentUserService.getCurrentUser().getId();
        return walletTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(transaction -> new WalletTransactionResponse(
                        transaction.getId(),
                        transaction.getUserId(),
                        transaction.getAmount(),
                        transaction.getType(),
                        transaction.getCreatedAt()))
                .toList();
    }

    private Wallet getOrCreateWallet() {
        String userId = currentUserService.getCurrentUser().getId();
        return walletRepository.findByUserId(userId).orElseGet(() -> {
            Wallet wallet = new Wallet();
            wallet.setUserId(userId);
            wallet.setBalance(BigDecimal.ZERO);
            return walletRepository.save(wallet);
        });
    }
}
