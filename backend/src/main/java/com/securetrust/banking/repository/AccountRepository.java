package com.securetrust.banking.repository;

import com.securetrust.banking.model.Account;
import com.securetrust.banking.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByAccountNumber(String accountNumber);
    List<Account> findByUser(User user);
    List<Account> findByUserUsername(String username);
    boolean existsByAccountNumber(String accountNumber);
    List<Account> findAllByOrderByCreatedAtDesc();
    long countByStatus(String status);
    @org.springframework.data.jpa.repository.Query("select coalesce(sum(a.balance), 0) from Account a")
    java.math.BigDecimal sumBalances();
}
