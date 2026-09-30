package com.securetrust.banking.dto;

import java.math.BigDecimal;

public record AdminAccountResponse(
        String accountNumber,
        String customerName,
        String username,
        String accountType,
        BigDecimal balance,
        String status
) {}