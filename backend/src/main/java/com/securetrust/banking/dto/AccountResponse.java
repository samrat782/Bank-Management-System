package com.securetrust.banking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccountResponse {
    private String accountNumber;
    private String ifscCode;
    private String branch;
    private String accountType;
    private BigDecimal balance;
    private String status;
}
