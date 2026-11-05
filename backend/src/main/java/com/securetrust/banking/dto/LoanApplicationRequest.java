package com.securetrust.banking.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
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

    @NotNull
    @Min(12)
    @Max(60)
    private Integer termMonths;
}