package com.securetrust.banking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_ref", nullable = false, unique = true, length = 40)
    private String transactionRef;

    @Column(name = "from_account_number", length = 20)
    private String fromAccountNumber;

    @Column(name = "to_account_number", length = 20)
    private String toAccountNumber;

    @Column(name = "beneficiary_name", length = 100)
    private String beneficiaryName;

    @Column(name = "beneficiary_bank_name", length = 100)
    private String beneficiaryBankName;

    @Column(name = "beneficiary_ifsc", length = 11)
    private String beneficiaryIfsc;

    @Column(name = "beneficiary_branch", length = 100)
    private String beneficiaryBranch;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 20)
    private String type; // DEPOSIT | WITHDRAW | TRANSFER | EXTERNAL_TRANSFER

    @Column(nullable = false, length = 20)
    private String status = "SUCCESS";

    @Column(length = 255)
    private String description;

    @Column(name = "balance_after", precision = 15, scale = 2)
    private BigDecimal balanceAfter;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
