package com.securetrust.banking.service;

import com.securetrust.banking.dto.DepositWithdrawRequest;
import com.securetrust.banking.dto.TransactionResponse;
import com.securetrust.banking.dto.TransferRequest;
import com.securetrust.banking.exception.InsufficientBalanceException;
import com.securetrust.banking.exception.ResourceNotFoundException;
import com.securetrust.banking.model.Account;
import com.securetrust.banking.model.Transaction;
import com.securetrust.banking.repository.AccountRepository;
import com.securetrust.banking.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final AccountService accountService;

    @Transactional
    public TransactionResponse deposit(DepositWithdrawRequest request, String username) {
        Account account = accountService.findOwnedAccount(request.getAccountNumber(), username);
        requireActiveAccount(account);

        account.setBalance(account.getBalance().add(request.getAmount()));
        accountRepository.save(account);

        Transaction txn = new Transaction();
        txn.setTransactionRef(newRef());
        txn.setToAccountNumber(account.getAccountNumber());
        txn.setAmount(request.getAmount());
        txn.setType("DEPOSIT");
        txn.setStatus("SUCCESS");
        txn.setDescription(orDefault(request.getDescription(), "Cash deposit"));
        txn.setBalanceAfter(account.getBalance());
        transactionRepository.save(txn);

        return toResponse(txn);
    }

    @Transactional
    public TransactionResponse withdraw(DepositWithdrawRequest request, String username) {
        Account account = accountService.findOwnedAccount(request.getAccountNumber(), username);
        requireActiveAccount(account);

        if (account.getBalance().compareTo(request.getAmount()) < 0) {
            throw new InsufficientBalanceException("Insufficient balance in account " + account.getAccountNumber());
        }

        account.setBalance(account.getBalance().subtract(request.getAmount()));
        accountRepository.save(account);

        Transaction txn = new Transaction();
        txn.setTransactionRef(newRef());
        txn.setFromAccountNumber(account.getAccountNumber());
        txn.setAmount(request.getAmount());
        txn.setType("WITHDRAW");
        txn.setStatus("SUCCESS");
        txn.setDescription(orDefault(request.getDescription(), "Cash withdrawal"));
        txn.setBalanceAfter(account.getBalance());
        transactionRepository.save(txn);

        return toResponse(txn);
    }

    @Transactional
    public TransactionResponse transfer(TransferRequest request, String username) {
        if (request.getFromAccountNumber().equals(request.getToAccountNumber())) {
            throw new IllegalArgumentException("Source and destination accounts must be different");
        }

        // The sender must own the source account.
        Account fromAccount = accountService.findOwnedAccount(request.getFromAccountNumber(), username);

        Account toAccount = accountRepository.findByAccountNumber(request.getToAccountNumber())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Destination account not found: " + request.getToAccountNumber()));
        requireActiveAccount(fromAccount);
        requireActiveAccount(toAccount);

        if (fromAccount.getBalance().compareTo(request.getAmount()) < 0) {
            throw new InsufficientBalanceException("Insufficient balance in account " + fromAccount.getAccountNumber());
        }

        fromAccount.setBalance(fromAccount.getBalance().subtract(request.getAmount()));
        toAccount.setBalance(toAccount.getBalance().add(request.getAmount()));
        accountRepository.save(fromAccount);
        accountRepository.save(toAccount);

        Transaction txn = new Transaction();
        txn.setTransactionRef(newRef());
        txn.setFromAccountNumber(fromAccount.getAccountNumber());
        txn.setToAccountNumber(toAccount.getAccountNumber());
        txn.setAmount(request.getAmount());
        txn.setType("TRANSFER");
        txn.setStatus("SUCCESS");
        txn.setDescription(orDefault(request.getDescription(), "Fund transfer"));
        txn.setBalanceAfter(fromAccount.getBalance());
        transactionRepository.save(txn);

        return toResponse(txn);
    }

    public List<TransactionResponse> getHistory(String accountNumber, String username) {
        // Ownership check first: throws if the account isn't the caller's.
        accountService.findOwnedAccount(accountNumber, username);

        return transactionRepository
                .findByFromAccountNumberOrToAccountNumberOrderByCreatedAtDesc(accountNumber, accountNumber)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private String newRef() {
        return "TXN" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    private String orDefault(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value;
    }

    private void requireActiveAccount(Account account) {
        if (!"ACTIVE".equals(account.getStatus()) || !"ACTIVE".equals(account.getUser().getStatus())) {
            throw new IllegalArgumentException("Account " + account.getAccountNumber() + " is not active");
        }
    }

    private TransactionResponse toResponse(Transaction txn) {
        return new TransactionResponse(
                txn.getTransactionRef(),
                txn.getFromAccountNumber(),
                txn.getToAccountNumber(),
                txn.getAmount(),
                txn.getType(),
                txn.getStatus(),
                txn.getDescription(),
                txn.getBalanceAfter(),
                txn.getCreatedAt()
        );
    }
}
