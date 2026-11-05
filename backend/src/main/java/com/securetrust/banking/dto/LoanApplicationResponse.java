package com.securetrust.banking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record LoanApplicationResponse(
        Long id,
        String username,
        String customerName,
        BigDecimal amount,
        String purpose,
        BigDecimal interestRate,
        Integer termMonths,
        BigDecimal monthlyPayment,
        String status,
        LocalDateTime appliedAt,
        LocalDateTime reviewedAt,
        String reviewNote
) {}