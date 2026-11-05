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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class LoanService {

    private static final Set<Integer> SUPPORTED_TERMS = Set.of(12, 24, 36, 60);

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
        if (!SUPPORTED_TERMS.contains(request.getTermMonths())) {
            throw new IllegalArgumentException("Choose a loan term of 12, 24, 36 or 60 months");
        }
        application.setTermMonths(request.getTermMonths());
        application.setInterestRate(rateForTerm(request.getTermMonths()));
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
                application.getInterestRate(), application.getTermMonths(), monthlyPayment(application),
                application.getStatus(), application.getAppliedAt(), application.getReviewedAt(),
                application.getReviewNote());
    }

    private BigDecimal rateForTerm(int termMonths) {
        return switch (termMonths) {
            case 12 -> new BigDecimal("10.50");
            case 24 -> new BigDecimal("11.00");
            case 36 -> new BigDecimal("11.50");
            case 60 -> new BigDecimal("12.00");
            default -> throw new IllegalArgumentException("Unsupported loan term");
        };
    }

    private BigDecimal monthlyPayment(LoanApplication application) {
        if (application.getInterestRate() == null || application.getTermMonths() == null) {
            return null;
        }
        double monthlyRate = application.getInterestRate().doubleValue() / 1200;
        double factor = Math.pow(1 + monthlyRate, application.getTermMonths());
        return application.getAmount().multiply(BigDecimal.valueOf(monthlyRate * factor / (factor - 1)))
                .setScale(2, RoundingMode.HALF_UP);
    }
}