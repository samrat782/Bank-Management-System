package com.securetrust.banking.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateAccountRequest {
    @NotBlank
    private String username;

    @NotBlank
    private String accountType;
}