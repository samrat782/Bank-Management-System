package com.securetrust.banking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoanDecisionRequest {
    @NotBlank
    private String decision;

    @Size(max = 255)
    private String note;
}