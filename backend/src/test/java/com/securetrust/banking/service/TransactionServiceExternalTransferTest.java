package com.securetrust.banking.service;

import com.securetrust.banking.dto.ExternalTransferRequest;
import com.securetrust.banking.dto.StatementResponse;
import com.securetrust.banking.dto.TransactionResponse;
import com.securetrust.banking.exception.InsufficientBalanceException;
import com.securetrust.banking.model.Account;
import com.securetrust.banking.model.Transaction;
import com.securetrust.banking.model.User;
import com.securetrust.banking.repository.AccountRepository;
import com.securetrust.banking.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionServiceExternalTransferTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private AccountService accountService;

    @InjectMocks
    private TransactionService transactionService;

    private Account sourceAccount;

    @BeforeEach
    void setUp() {
        User owner = new User();
        owner.setStatus("ACTIVE");

        sourceAccount = new Account();
        sourceAccount.setAccountNumber("STBK1000000001");
        sourceAccount.setBalance(new BigDecimal("5000.00"));
        sourceAccount.setStatus("ACTIVE");
        sourceAccount.setUser(owner);

        when(accountService.findOwnedAccount("STBK1000000001", "customer"))
                .thenReturn(sourceAccount);
    }

    @Test
    void externalTransferDebitsSourceAndRecordsBeneficiary() {
        ExternalTransferRequest request = request("1250.50");

        TransactionResponse response = transactionService.externalTransfer(request, "customer");

        assertEquals(new BigDecimal("3749.50"), sourceAccount.getBalance());
        assertEquals("EXTERNAL_TRANSFER", response.getType());
        assertEquals("SIMULATED", response.getStatus());
        assertEquals("HDFC0001234", response.getBeneficiaryIfsc());

        ArgumentCaptor<Transaction> transactionCaptor = ArgumentCaptor.forClass(Transaction.class);
        verify(transactionRepository).save(transactionCaptor.capture());
        Transaction savedTransaction = transactionCaptor.getValue();
        assertEquals("123456789012", savedTransaction.getToAccountNumber());
        assertEquals("Asha Patel", savedTransaction.getBeneficiaryName());
        assertEquals("HDFC0001234", savedTransaction.getBeneficiaryIfsc());
        assertEquals("Mumbai Central", savedTransaction.getBeneficiaryBranch());
        verify(accountRepository).save(sourceAccount);
    }

    @Test
    void externalTransferWithInsufficientFundsDoesNotSaveAnything() {
        ExternalTransferRequest request = request("6000.00");

        assertThrows(InsufficientBalanceException.class,
                () -> transactionService.externalTransfer(request, "customer"));

        verify(accountRepository, never()).save(any(Account.class));
        verify(transactionRepository, never()).save(any(Transaction.class));
    }

        @Test
        void statementFiltersByDateAndTypeAndCalculatesPeriodBalances() {
        sourceAccount.setBalance(new BigDecimal("1080.00"));
        Transaction afterPeriod = transaction("STBK1000000001", null, "20.00", "WITHDRAW",
            LocalDateTime.of(2026, 1, 4, 10, 0));
        Transaction inPeriod = transaction(null, "STBK1000000001", "100.00", "DEPOSIT",
            LocalDateTime.of(2026, 1, 2, 10, 0));
        Transaction beforePeriod = transaction(null, "STBK1000000001", "50.00", "DEPOSIT",
            LocalDateTime.of(2026, 1, 1, 10, 0));
        when(transactionRepository.findByFromAccountNumberOrToAccountNumberOrderByCreatedAtDesc(
            "STBK1000000001", "STBK1000000001"))
            .thenReturn(List.of(afterPeriod, inPeriod, beforePeriod));

        StatementResponse statement = transactionService.getStatement(
            "STBK1000000001", "customer", LocalDate.of(2026, 1, 2), LocalDate.of(2026, 1, 2), "deposit");

        assertEquals(new BigDecimal("1000.00"), statement.getOpeningBalance());
        assertEquals(new BigDecimal("1100.00"), statement.getClosingBalance());
        assertEquals(1, statement.getTransactions().size());
        assertEquals("DEPOSIT", statement.getTransactions().getFirst().getType());
        }

        private Transaction transaction(String from, String to, String amount, String type, LocalDateTime createdAt) {
        Transaction transaction = new Transaction();
        transaction.setFromAccountNumber(from);
        transaction.setToAccountNumber(to);
        transaction.setAmount(new BigDecimal(amount));
        transaction.setType(type);
        transaction.setStatus("SUCCESS");
        transaction.setCreatedAt(createdAt);
        return transaction;
        }

    private ExternalTransferRequest request(String amount) {
        ExternalTransferRequest request = new ExternalTransferRequest();
        request.setFromAccountNumber("STBK1000000001");
        request.setBeneficiaryName("Asha Patel");
        request.setBeneficiaryBankName("HDFC Bank");
        request.setBeneficiaryAccountNumber("123456789012");
        request.setBeneficiaryIfsc("hdfc0001234");
        request.setBeneficiaryBranch("Mumbai Central");
        request.setAmount(new BigDecimal(amount));
        return request;
    }
}