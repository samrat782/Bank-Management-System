package com.securetrust.banking.controller;

import com.securetrust.banking.dto.AccountResponse;
import com.securetrust.banking.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    /** All accounts belonging to the logged-in user. */
    @GetMapping("/my")
    public ResponseEntity<List<AccountResponse>> myAccounts(Authentication authentication) {
        return ResponseEntity.ok(accountService.getAccountsForUser(authentication.getName()));
    }

    /** Details (including balance) of one account, only if it belongs to the caller. */
    @GetMapping("/{accountNumber}")
    public ResponseEntity<AccountResponse> accountDetails(@PathVariable String accountNumber,
                                                            Authentication authentication) {
        return ResponseEntity.ok(accountService.getAccountDetails(accountNumber, authentication.getName()));
    }
}
