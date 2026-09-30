package com.securetrust.banking.service;

import com.securetrust.banking.dto.LoanApplicationRequest;
import com.securetrust.banking.dto.LoanApplicationResponse;
import com.securetrust.banking.exception.ResourceNotFoundException;
import com.securetrust.banking.model.LoanApplication;
import com.securetrust.banking.model.User;
import com.securetrust.banking.repository.LoanApplicationRepository;
import com.securetrust.banking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LoanService {

    private final UserRepository userRepository;
    private final LoanApplicationRepository loanApplicationRepository;

    @Transactional
    public LoanApplicationResponse apply(LoanApplicationRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + username));
        LoanApplication application = new LoanApplication();
        application.setUser(user);
        application.setAmount(request.getAmount());
        application.setPurpose(request.getPurpose().trim());
        return toResponse(loanApplicationRepository.save(application));
    }

    @Transactional(readOnly = true)
    public List<LoanApplicationResponse> getMyApplications(String username) {
        return loanApplicationRepository.findByUserUsernameOrderByAppliedAtDesc(username).stream()
                .map(this::toResponse)
                .toList();
    }

    private LoanApplicationResponse toResponse(LoanApplication application) {
        return new LoanApplicationResponse(application.getId(), application.getUser().getUsername(),
                application.getUser().getFullName(), application.getAmount(), application.getPurpose(),
                application.getStatus(), application.getAppliedAt(), application.getReviewedAt(),
                application.getReviewNote());
    }
}