package com.securetrust.banking.controller;

import com.securetrust.banking.dto.DepositWithdrawRequest;
import com.securetrust.banking.dto.ExternalTransferRequest;
import com.securetrust.banking.dto.StatementResponse;
import com.securetrust.banking.dto.TransactionResponse;
import com.securetrust.banking.dto.TransferRequest;
import com.securetrust.banking.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.time.LocalDate;

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

    @PostMapping("/transfer/external")
    public ResponseEntity<TransactionResponse> externalTransfer(@Valid @RequestBody ExternalTransferRequest request,
                                                                  Authentication authentication) {
        return ResponseEntity.ok(transactionService.externalTransfer(request, authentication.getName()));
    }

    @GetMapping("/history/{accountNumber}")
    public ResponseEntity<List<TransactionResponse>> history(@PathVariable String accountNumber,
                                                               Authentication authentication) {
        return ResponseEntity.ok(transactionService.getHistory(accountNumber, authentication.getName()));
    }

    @GetMapping("/mini-statement/{accountNumber}")
    public ResponseEntity<List<TransactionResponse>> miniStatement(@PathVariable String accountNumber,
                                                                     Authentication authentication) {
        return ResponseEntity.ok(transactionService.getMiniStatement(accountNumber, authentication.getName()));
    }

    @GetMapping("/statement/{accountNumber}")
    public ResponseEntity<StatementResponse> statement(@PathVariable String accountNumber,
                                                        @RequestParam(required = false) LocalDate fromDate,
                                                        @RequestParam(required = false) LocalDate toDate,
                                                        @RequestParam(defaultValue = "ALL") String type,
                                                        Authentication authentication) {
        return ResponseEntity.ok(transactionService.getStatement(
                accountNumber, authentication.getName(), fromDate, toDate, type));
    }
}
