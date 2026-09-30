package com.securetrust.banking.dto;

import java.time.LocalDateTime;

public record AdminCustomerResponse(
        Long id,
        String fullName,
        String email,
        String username,
        String phoneNumber,
        String status,
        LocalDateTime createdAt
) {}