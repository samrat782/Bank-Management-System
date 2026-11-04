package com.securetrust.banking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@AllArgsConstructor
public class StatementResponse {
    private String accountNumber;
    private LocalDate fromDate;
    private LocalDate toDate;
    private String type;
    private BigDecimal openingBalance;
    private BigDecimal closingBalance;
    private List<TransactionResponse> transactions;
}