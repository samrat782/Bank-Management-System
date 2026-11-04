package com.securetrust.banking.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ExternalTransferRequest {

    @NotBlank(message = "Source account number is required")
    private String fromAccountNumber;

    @NotBlank(message = "Beneficiary name is required")
    @Size(max = 100, message = "Beneficiary name must be 100 characters or fewer")
    private String beneficiaryName;

    @NotBlank(message = "Beneficiary bank name is required")
    @Size(max = 100, message = "Bank name must be 100 characters or fewer")
    private String beneficiaryBankName;

    @NotBlank(message = "Beneficiary account number is required")
    @Pattern(regexp = "^[0-9]{6,18}$", message = "Beneficiary account number must contain 6 to 18 digits")
    private String beneficiaryAccountNumber;

    @NotBlank(message = "IFSC code is required")
    @Pattern(regexp = "(?i)^[A-Z]{4}0[A-Z0-9]{6}$", message = "Enter a valid 11-character IFSC code")
    private String beneficiaryIfsc;

    @NotBlank(message = "Branch name is required")
    @Size(max = 100, message = "Branch name must be 100 characters or fewer")
    private String beneficiaryBranch;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.00", message = "Amount must be at least 1.00")
    @Digits(integer = 13, fraction = 2, message = "Amount can have up to 13 digits and 2 decimal places")
    private BigDecimal amount;

    @Size(max = 255, message = "Remarks must be 255 characters or fewer")
    private String description;
}