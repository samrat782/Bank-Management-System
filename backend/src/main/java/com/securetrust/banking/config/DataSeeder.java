package com.securetrust.banking.config;

import com.securetrust.banking.model.Account;
import com.securetrust.banking.model.User;
import com.securetrust.banking.repository.AccountRepository;
import com.securetrust.banking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Seeds one demo customer + two demo accounts the first time the app
 * starts against an empty database, so you can log in immediately
 * without registering a new user first.
 *
 * Demo login:  username = demo_user   password = Demo@1234
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByUsername("demo_user")) {
            User demoUser = new User();
            demoUser.setFullName("Demo Customer");
            demoUser.setEmail("demo@securetrustbank.com");
            demoUser.setUsername("demo_user");
            demoUser.setPassword(passwordEncoder.encode("Demo@1234"));
            demoUser.setPhoneNumber("9876543210");
            demoUser.setRole("CUSTOMER");
            userRepository.save(demoUser);

            Account savings = new Account();
            savings.setAccountNumber("STBK1000000001");
            savings.setAccountType("SAVINGS");
            savings.setBalance(new BigDecimal("50000.00"));
            savings.setUser(demoUser);
            accountRepository.save(savings);

            Account current = new Account();
            current.setAccountNumber("STBK1000000002");
            current.setAccountType("CURRENT");
            current.setBalance(new BigDecimal("15000.00"));
            current.setUser(demoUser);
            accountRepository.save(current);

            System.out.println("=============================================================");
            System.out.println(" Demo user seeded -> username: demo_user  password: Demo@1234");
            System.out.println("=============================================================");
        }

        if (!userRepository.existsByUsername("bank_admin")) {
            User admin = new User();
            admin.setFullName("Bank Administrator");
            admin.setEmail("admin@securetrustbank.com");
            admin.setUsername("bank_admin");
            admin.setPassword(passwordEncoder.encode("Admin@1234"));
            admin.setPhoneNumber("0000000000");
            admin.setRole("ADMIN");
            userRepository.save(admin);
            System.out.println("Admin user seeded -> username: bank_admin  password: Admin@1234");
        }
    }
}
