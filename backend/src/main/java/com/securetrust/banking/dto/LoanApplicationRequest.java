package com.securetrust.banking.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class LoanApplicationRequest {
    @NotNull
    @DecimalMin(value = "1.00", message = "Loan amount must be at least 1.00")
    private BigDecimal amount;

    @NotBlank
    @Size(max = 255)
    private String purpose;
}