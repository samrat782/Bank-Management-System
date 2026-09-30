package com.securetrust.banking.dto;

import java.math.BigDecimal;

public record AdminStatsResponse(
        long activeCustomers,
        long inactiveCustomers,
        long activeAccounts,
        long frozenAccounts,
        long closedAccounts,
        long transactionCount,
        long todayTransactions,
        long pendingLoanApplications,
        BigDecimal totalAccountBalances
) {}