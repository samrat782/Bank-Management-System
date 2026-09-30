package com.securetrust.banking.repository;

import com.securetrust.banking.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    java.util.List<User> findAllByRoleOrderByCreatedAtDesc(String role);
    long countByRoleAndStatus(String role, String status);
}
