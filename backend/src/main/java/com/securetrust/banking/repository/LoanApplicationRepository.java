package com.securetrust.banking.repository;

import com.securetrust.banking.model.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoanApplicationRepository extends JpaRepository<LoanApplication, Long> {
    List<LoanApplication> findAllByOrderByAppliedAtDesc();
    List<LoanApplication> findByUserUsernameOrderByAppliedAtDesc(String username);
    long countByStatus(String status);
}