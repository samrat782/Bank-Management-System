package com.securetrust.banking.controller;

import com.securetrust.banking.dto.DepositWithdrawRequest;
import com.securetrust.banking.dto.TransactionResponse;
import com.securetrust.banking.dto.TransferRequest;
import com.securetrust.banking.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping("/deposit")
    public ResponseEntity<TransactionResponse> deposit(@Valid @RequestBody DepositWithdrawRequest request,
                                                         Authentication authentication) {
        return ResponseEntity.ok(transactionService.deposit(request, authentication.getName()));
    }

    @PostMapping("/withdraw")
    public ResponseEntity<TransactionResponse> withdraw(@Valid @RequestBody DepositWithdrawRequest request,
                                                          Authentication authentication) {
        return ResponseEntity.ok(transactionService.withdraw(request, authentication.getName()));
    }

    @PostMapping("/transfer")
    public ResponseEntity<TransactionResponse> transfer(@Valid @RequestBody TransferRequest request,
                                                          Authentication authentication) {
        return ResponseEntity.ok(transactionService.transfer(request, authentication.getName()));
    }

    @GetMapping("/history/{accountNumber}")
    public ResponseEntity<List<TransactionResponse>> history(@PathVariable String accountNumber,
                                                               Authentication authentication) {
        return ResponseEntity.ok(transactionService.getHistory(accountNumber, authentication.getName()));
    }
}
