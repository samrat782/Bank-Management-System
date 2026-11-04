package com.securetrust.banking.service;

import com.securetrust.banking.dto.*;
import com.securetrust.banking.exception.ResourceNotFoundException;
import com.securetrust.banking.model.Account;
import com.securetrust.banking.model.LoanApplication;
import com.securetrust.banking.model.Transaction;
import com.securetrust.banking.model.User;
import com.securetrust.banking.repository.AccountRepository;
import com.securetrust.banking.repository.LoanApplicationRepository;
import com.securetrust.banking.repository.TransactionRepository;
import com.securetrust.banking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AdminService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final AuthService authService;

    public AdminStatsResponse getStats() {
        return new AdminStatsResponse(
                userRepository.countByRoleAndStatus("CUSTOMER", "ACTIVE"),
                userRepository.countByRoleAndStatus("CUSTOMER", "INACTIVE"),
                accountRepository.countByStatus("ACTIVE"),
                accountRepository.countByStatus("BLOCKED"),
                accountRepository.countByStatus("CLOSED"),
                transactionRepository.count(),
                transactionRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                    LocalDate.now().atStartOfDay(), LocalDate.now().plusDays(1).atStartOfDay()),
                loanApplicationRepository.countByStatus("PENDING"),
                accountRepository.sumBalances()
        );
    }

    public List<AdminCustomerResponse> getCustomers() {
        return userRepository.findAllByRoleOrderByCreatedAtDesc("CUSTOMER").stream()
                .map(this::toCustomerResponse)
                .toList();
    }

    @Transactional
    public AdminCustomerResponse addCustomer(RegisterRequest request) {
        return toCustomerResponse(authService.createCustomer(request));
    }

    @Transactional
    public AdminCustomerResponse removeCustomer(String username) {
        User customer = findCustomer(username);
        customer.setStatus("INACTIVE");
        return toCustomerResponse(userRepository.save(customer));
    }

    @Transactional
    public AdminCustomerResponse restoreCustomer(String username) {
        User customer = findCustomer(username);
        customer.setStatus("ACTIVE");
        return toCustomerResponse(userRepository.save(customer));
    }

    @Transactional(readOnly = true)
    public List<AdminAccountResponse> getAccounts() {
        return accountRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toAccountResponse)
                .toList();
    }

    @Transactional
    public AdminAccountResponse createAccount(CreateAccountRequest request) {
        User customer = findCustomer(request.getUsername());
        if (!"ACTIVE".equals(customer.getStatus())) {
            throw new IllegalArgumentException("Cannot open an account for an inactive customer");
        }

        String type = request.getAccountType().trim().toUpperCase(Locale.ROOT);
        if (!type.equals("SAVINGS") && !type.equals("CURRENT")) {
            throw new IllegalArgumentException("Account type must be SAVINGS or CURRENT");
        }

        Account account = new Account();
        account.setAccountNumber(generateAccountNumber());
        account.setAccountType(type);
        account.setBalance(BigDecimal.ZERO);
        account.setUser(customer);
        return toAccountResponse(accountRepository.save(account));
    }

    @Transactional
    public AdminAccountResponse freezeAccount(String accountNumber) {
        Account account = findAccount(accountNumber);
        requireAccountStatus(account, "ACTIVE");
        account.setStatus("BLOCKED");
        return toAccountResponse(accountRepository.save(account));
    }

    @Transactional
    public AdminAccountResponse unfreezeAccount(String accountNumber) {
        Account account = findAccount(accountNumber);
        requireAccountStatus(account, "BLOCKED");
        account.setStatus("ACTIVE");
        return toAccountResponse(accountRepository.save(account));
    }

    @Transactional
    public AdminAccountResponse closeAccount(String accountNumber) {
        Account account = findAccount(accountNumber);
        if ("CLOSED".equals(account.getStatus())) {
            throw new IllegalArgumentException("Account is already closed");
        }
        if (account.getBalance().compareTo(BigDecimal.ZERO) != 0) {
            throw new IllegalArgumentException("Transfer or withdraw the account balance before closing it");
        }
        account.setStatus("CLOSED");
        return toAccountResponse(accountRepository.save(account));
    }

    public List<TransactionResponse> searchTransactions(String search) {
        List<Transaction> transactions = transactionRepository.findAllByOrderByCreatedAtDesc();
        if (search == null || search.isBlank()) {
            return transactions.stream().map(this::toTransactionResponse).toList();
        }

        String query = search.trim().toLowerCase(Locale.ROOT);
        return transactions.stream()
                .filter(transaction -> transactionSearchText(transaction).contains(query))
                .map(this::toTransactionResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LoanApplicationResponse> getLoanApplications() {
        return loanApplicationRepository.findAllByOrderByAppliedAtDesc().stream()
                .map(this::toLoanResponse)
                .toList();
    }

    @Transactional
    public LoanApplicationResponse decideLoan(long id, LoanDecisionRequest request) {
        LoanApplication application = loanApplicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Loan application not found: " + id));
        if (!"PENDING".equals(application.getStatus())) {
            throw new IllegalArgumentException("This loan application has already been reviewed");
        }

        String decision = request.getDecision().trim().toUpperCase(Locale.ROOT);
        if (!decision.equals("APPROVED") && !decision.equals("REJECTED")) {
            throw new IllegalArgumentException("Decision must be APPROVED or REJECTED");
        }
        application.setStatus(decision);
        application.setReviewNote(request.getNote());
        application.setReviewedAt(LocalDateTime.now());
        return toLoanResponse(loanApplicationRepository.save(application));
    }

    private User findCustomer(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + username));
        if (!"CUSTOMER".equals(user.getRole())) {
            throw new IllegalArgumentException("The requested user is not a customer");
        }
        return user;
    }

    private Account findAccount(String accountNumber) {
        return accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + accountNumber));
    }

    private void requireAccountStatus(Account account, String expected) {
        if (!expected.equals(account.getStatus())) {
            throw new IllegalArgumentException("Account must be " + expected.toLowerCase(Locale.ROOT) + " to perform this action");
        }
    }

    private String generateAccountNumber() {
        String number;
        do {
            long suffix = 1_000_000_000L + (long) (RANDOM.nextDouble() * 8_999_999_999L);
            number = "STBK" + suffix;
        } while (accountRepository.existsByAccountNumber(number));
        return number;
    }

    private String transactionSearchText(Transaction transaction) {
        return String.join(" ",
                safe(transaction.getTransactionRef()),
                safe(transaction.getFromAccountNumber()),
                safe(transaction.getToAccountNumber()),
                safe(transaction.getType()),
                safe(transaction.getStatus()),
                safe(transaction.getDescription()),
                transaction.getAmount().toPlainString()
        ).toLowerCase(Locale.ROOT);
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private AdminCustomerResponse toCustomerResponse(User user) {
        return new AdminCustomerResponse(user.getId(), user.getFullName(), user.getEmail(), user.getUsername(),
                user.getPhoneNumber(), user.getStatus(), user.getCreatedAt());
    }

    private AdminAccountResponse toAccountResponse(Account account) {
        return new AdminAccountResponse(account.getAccountNumber(), account.getUser().getFullName(),
                account.getUser().getUsername(), account.getAccountType(), account.getBalance(), account.getStatus());
    }

    private TransactionResponse toTransactionResponse(Transaction transaction) {
        return new TransactionResponse(transaction.getTransactionRef(), transaction.getFromAccountNumber(),
                transaction.getToAccountNumber(), transaction.getAmount(), transaction.getType(),
                transaction.getStatus(), transaction.getDescription(), transaction.getBalanceAfter(),
            transaction.getCreatedAt(), transaction.getBeneficiaryName(), transaction.getBeneficiaryBankName(),
            transaction.getBeneficiaryIfsc(), transaction.getBeneficiaryBranch());
    }

    private LoanApplicationResponse toLoanResponse(LoanApplication application) {
        return new LoanApplicationResponse(application.getId(), application.getUser().getUsername(),
                application.getUser().getFullName(), application.getAmount(), application.getPurpose(),
                application.getStatus(), application.getAppliedAt(), application.getReviewedAt(),
                application.getReviewNote());
    }
}