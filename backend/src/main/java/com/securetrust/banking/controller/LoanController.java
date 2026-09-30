package com.securetrust.banking.controller;

import com.securetrust.banking.dto.LoanApplicationRequest;
import com.securetrust.banking.dto.LoanApplicationResponse;
import com.securetrust.banking.service.LoanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/loans")
@RequiredArgsConstructor
public class LoanController {

    private final LoanService loanService;

    @GetMapping("/my")
    public List<LoanApplicationResponse> myApplications(Authentication authentication) {
        return loanService.getMyApplications(authentication.getName());
    }

    @PostMapping
    public ResponseEntity<LoanApplicationResponse> apply(@Valid @RequestBody LoanApplicationRequest request,
                                                          Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(loanService.apply(request, authentication.getName()));
    }
}