package com.securetrust.banking.service;

import com.securetrust.banking.dto.AccountResponse;
import com.securetrust.banking.exception.ResourceNotFoundException;
import com.securetrust.banking.model.Account;
import com.securetrust.banking.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;

    public List<AccountResponse> getAccountsForUser(String username) {
        return accountRepository.findByUserUsername(username).stream()
                .map(this::toResponse)
                .toList();
    }

    public AccountResponse getAccountDetails(String accountNumber, String requestingUsername) {
        Account account = findOwnedAccount(accountNumber, requestingUsername);
        return toResponse(account);
    }

    /**
     * Looks up an account by number and verifies it belongs to the
     * currently authenticated user, so nobody can peek at someone
     * else's balance just by guessing an account number.
     */
    public Account findOwnedAccount(String accountNumber, String requestingUsername) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + accountNumber));

        if (!account.getUser().getUsername().equals(requestingUsername)) {
            throw new AccessDeniedException("You do not have access to this account");
        }
        return account;
    }

    private AccountResponse toResponse(Account account) {
        return new AccountResponse(
                account.getAccountNumber(),
                account.getIfscCode(),
                account.getBranch(),
                account.getAccountType(),
                account.getBalance(),
                account.getStatus()
        );
    }
}
