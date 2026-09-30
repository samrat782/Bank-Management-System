package com.securetrust.banking.controller;

import com.securetrust.banking.dto.*;
import com.securetrust.banking.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public AdminStatsResponse stats() {
        return adminService.getStats();
    }

    @GetMapping("/customers")
    public List<AdminCustomerResponse> customers() {
        return adminService.getCustomers();
    }

    @PostMapping("/customers")
    public ResponseEntity<AdminCustomerResponse> addCustomer(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.addCustomer(request));
    }

    @DeleteMapping("/customers/{username}")
    public AdminCustomerResponse removeCustomer(@PathVariable String username) {
        return adminService.removeCustomer(username);
    }

    @PostMapping("/customers/{username}/restore")
    public AdminCustomerResponse restoreCustomer(@PathVariable String username) {
        return adminService.restoreCustomer(username);
    }

    @GetMapping("/accounts")
    public List<AdminAccountResponse> accounts() {
        return adminService.getAccounts();
    }

    @PostMapping("/accounts")
    public ResponseEntity<AdminAccountResponse> createAccount(@Valid @RequestBody CreateAccountRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createAccount(request));
    }

    @PostMapping("/accounts/{accountNumber}/freeze")
    public AdminAccountResponse freezeAccount(@PathVariable String accountNumber) {
        return adminService.freezeAccount(accountNumber);
    }

    @PostMapping("/accounts/{accountNumber}/unfreeze")
    public AdminAccountResponse unfreezeAccount(@PathVariable String accountNumber) {
        return adminService.unfreezeAccount(accountNumber);
    }

    @PostMapping("/accounts/{accountNumber}/close")
    public AdminAccountResponse closeAccount(@PathVariable String accountNumber) {
        return adminService.closeAccount(accountNumber);
    }

    @GetMapping("/transactions")
    public List<TransactionResponse> transactions(@RequestParam(required = false) String search) {
        return adminService.searchTransactions(search);
    }

    @GetMapping("/loans")
    public List<LoanApplicationResponse> loans() {
        return adminService.getLoanApplications();
    }

    @PostMapping("/loans/{id}/decision")
    public LoanApplicationResponse decideLoan(@PathVariable long id,
                                               @Valid @RequestBody LoanDecisionRequest request) {
        return adminService.decideLoan(id, request);
    }
}