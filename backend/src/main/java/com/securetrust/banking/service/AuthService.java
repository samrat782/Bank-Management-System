package com.securetrust.banking.service;

import com.securetrust.banking.dto.AuthResponse;
import com.securetrust.banking.dto.LoginRequest;
import com.securetrust.banking.dto.RegisterRequest;
import com.securetrust.banking.exception.DuplicateResourceException;
import com.securetrust.banking.model.Account;
import com.securetrust.banking.model.User;
import com.securetrust.banking.repository.AccountRepository;
import com.securetrust.banking.repository.UserRepository;
import com.securetrust.banking.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        User user = createCustomer(request);
        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthResponse(token, user.getUsername(), user.getFullName(), user.getEmail(), user.getRole());
    }

    @Transactional
    public User createCustomer(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email is already registered");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPhoneNumber(request.getPhoneNumber());
        user.setRole("CUSTOMER");
        userRepository.save(user);

        Account account = new Account();
        account.setAccountNumber(generateUniqueAccountNumber());
        account.setAccountType("SAVINGS");
        account.setBalance(BigDecimal.ZERO);
        account.setUser(user);
        accountRepository.save(account);
        return user;
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalStateException("User vanished after authentication"));
        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthResponse(token, user.getUsername(), user.getFullName(), user.getEmail(), user.getRole());
    }

    private String generateUniqueAccountNumber() {
        String accountNumber;
        do {
            long suffix = 1_000_000_000L + (long) (RANDOM.nextDouble() * 8_999_999_999L);
            accountNumber = "STBK" + suffix;
        } while (accountRepository.existsByAccountNumber(accountNumber));
        return accountNumber;
    }
}
