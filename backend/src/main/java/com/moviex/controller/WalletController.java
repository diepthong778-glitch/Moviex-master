package com.moviex.controller;

import com.moviex.dto.DepositRequest;
import com.moviex.dto.WalletResponse;
import com.moviex.dto.WalletTransactionResponse;
import com.moviex.service.WalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping
    public ResponseEntity<WalletResponse> getWallet() {
        return ResponseEntity.ok(walletService.getWallet());
    }

    @PostMapping("/deposit")
    public ResponseEntity<WalletResponse> deposit(@RequestBody DepositRequest request) {
        return ResponseEntity.ok(walletService.deposit(request));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<WalletTransactionResponse>> getTransactions() {
        return ResponseEntity.ok(walletService.getTransactions());
    }
}
