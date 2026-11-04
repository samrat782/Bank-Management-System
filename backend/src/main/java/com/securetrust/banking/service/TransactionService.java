package com.securetrust.banking.service;

import com.securetrust.banking.dto.DepositWithdrawRequest;
import com.securetrust.banking.dto.ExternalTransferRequest;
import com.securetrust.banking.dto.StatementResponse;
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
import java.util.Locale;
import java.util.UUID;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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

    @Transactional
    public TransactionResponse externalTransfer(ExternalTransferRequest request, String username) {
        Account fromAccount = accountService.findOwnedAccount(request.getFromAccountNumber(), username);
        requireActiveAccount(fromAccount);

        if (fromAccount.getBalance().compareTo(request.getAmount()) < 0) {
            throw new InsufficientBalanceException("Insufficient balance in account " + fromAccount.getAccountNumber());
        }

        fromAccount.setBalance(fromAccount.getBalance().subtract(request.getAmount()));
        accountRepository.save(fromAccount);

        Transaction txn = new Transaction();
        txn.setTransactionRef(newRef());
        txn.setFromAccountNumber(fromAccount.getAccountNumber());
        txn.setToAccountNumber(request.getBeneficiaryAccountNumber());
        txn.setBeneficiaryName(request.getBeneficiaryName().trim());
        txn.setBeneficiaryBankName(request.getBeneficiaryBankName().trim());
        txn.setBeneficiaryIfsc(request.getBeneficiaryIfsc().trim().toUpperCase(Locale.ROOT));
        txn.setBeneficiaryBranch(request.getBeneficiaryBranch().trim());
        txn.setAmount(request.getAmount());
        txn.setType("EXTERNAL_TRANSFER");
        txn.setStatus("SIMULATED");
        txn.setDescription(orDefault(request.getDescription(), "Simulated external bank transfer"));
        txn.setBalanceAfter(fromAccount.getBalance());
        transactionRepository.save(txn);

        return toResponse(txn);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getHistory(String accountNumber, String username) {
        // Ownership check first: throws if the account isn't the caller's.
        accountService.findOwnedAccount(accountNumber, username);

        return transactionRepository
                .findByFromAccountNumberOrToAccountNumberOrderByCreatedAtDesc(accountNumber, accountNumber)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getMiniStatement(String accountNumber, String username) {
        return getHistory(accountNumber, username).stream().limit(5).toList();
    }

    @Transactional(readOnly = true)
    public StatementResponse getStatement(String accountNumber, String username,
                                          LocalDate fromDate, LocalDate toDate, String requestedType) {
        Account account = accountService.findOwnedAccount(accountNumber, username);
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new IllegalArgumentException("The start date must be on or before the end date");
        }

        String type = requestedType == null || requestedType.isBlank()
                ? "ALL" : requestedType.trim().toUpperCase(Locale.ROOT);
        if (!List.of("ALL", "DEPOSIT", "WITHDRAW", "TRANSFER", "EXTERNAL_TRANSFER").contains(type)) {
            throw new IllegalArgumentException("Unsupported transaction type: " + type);
        }

        List<Transaction> history = transactionRepository
                .findByFromAccountNumberOrToAccountNumberOrderByCreatedAtDesc(accountNumber, accountNumber);
        LocalDateTime start = fromDate == null ? null : fromDate.atStartOfDay();
        LocalDateTime endExclusive = toDate == null ? null : toDate.plusDays(1).atStartOfDay();

        BigDecimal netAfterPeriod = history.stream()
                .filter(transaction -> endExclusive != null && !transaction.getCreatedAt().isBefore(endExclusive))
                .map(transaction -> transactionDelta(transaction, accountNumber))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal closingBalance = account.getBalance().subtract(netAfterPeriod);

        List<Transaction> periodTransactions = history.stream()
                .filter(transaction -> start == null || !transaction.getCreatedAt().isBefore(start))
                .filter(transaction -> endExclusive == null || transaction.getCreatedAt().isBefore(endExclusive))
                .toList();
        BigDecimal periodNet = periodTransactions.stream()
                .map(transaction -> transactionDelta(transaction, accountNumber))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal openingBalance = closingBalance.subtract(periodNet);

        List<TransactionResponse> filteredTransactions = periodTransactions.stream()
                .filter(transaction -> "ALL".equals(type) || type.equals(transaction.getType()))
                .map(this::toResponse)
                .toList();

        return new StatementResponse(accountNumber, fromDate, toDate, type,
                openingBalance, closingBalance, filteredTransactions);
    }

    private BigDecimal transactionDelta(Transaction transaction, String accountNumber) {
        if (accountNumber.equals(transaction.getFromAccountNumber())) {
            return transaction.getAmount().negate();
        }
        if (accountNumber.equals(transaction.getToAccountNumber())) {
            return transaction.getAmount();
        }
        return BigDecimal.ZERO;
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
                txn.getCreatedAt(),
                txn.getBeneficiaryName(),
                txn.getBeneficiaryBankName(),
                txn.getBeneficiaryIfsc(),
                txn.getBeneficiaryBranch()
        );
    }
}
