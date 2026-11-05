-- =====================================================================
-- SecureTrust Bank - Database Schema
-- Run this script in MySQL Workbench / mysql CLI before starting the
-- backend. It creates the database, tables, and one demo user so you
-- can log in immediately.
-- =====================================================================

DROP DATABASE IF EXISTS banking_management_system;
CREATE DATABASE banking_management_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE banking_management_system;

-- ---------------------------------------------------------------------
-- USERS  (a customer who can log in to net-banking)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(100)  NOT NULL,
    email           VARCHAR(150)  NOT NULL UNIQUE,
    username        VARCHAR(50)   NOT NULL UNIQUE,
    password        VARCHAR(255)  NOT NULL,          -- BCrypt hash
    phone_number    VARCHAR(15)   NOT NULL,
    role            VARCHAR(20)   NOT NULL DEFAULT 'CUSTOMER',
    status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ACCOUNTS  (a bank account owned by a user; a user can have many)
-- ---------------------------------------------------------------------
CREATE TABLE accounts (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_number    VARCHAR(20)   NOT NULL UNIQUE,
    ifsc_code         VARCHAR(15)   NOT NULL DEFAULT 'STBK0001234',
    branch            VARCHAR(100)  NOT NULL DEFAULT 'Kolkata Main Branch',
    account_type      VARCHAR(20)   NOT NULL DEFAULT 'SAVINGS',   -- SAVINGS | CURRENT
    balance           DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',    -- ACTIVE | BLOCKED | CLOSED
    user_id           BIGINT        NOT NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TRANSACTIONS  (deposit / withdraw / transfer ledger)
-- ---------------------------------------------------------------------
CREATE TABLE transactions (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_ref     VARCHAR(40)   NOT NULL UNIQUE,
    from_account_number VARCHAR(20),
    to_account_number   VARCHAR(20),
    beneficiary_name    VARCHAR(100),
    beneficiary_bank_name VARCHAR(100),
    beneficiary_ifsc   VARCHAR(11),
    beneficiary_branch  VARCHAR(100),
    amount              DECIMAL(15,2) NOT NULL,
    type                VARCHAR(20)   NOT NULL,       -- DEPOSIT | WITHDRAW | TRANSFER | EXTERNAL_TRANSFER
    status              VARCHAR(20)   NOT NULL DEFAULT 'SUCCESS',
    description         VARCHAR(255),
    balance_after        DECIMAL(15,2),
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_txn_from_account ON transactions(from_account_number);
CREATE INDEX idx_txn_to_account   ON transactions(to_account_number);

-- ---------------------------------------------------------------------
-- LOAN APPLICATIONS (customer-submitted requests and admin decisions)
-- ---------------------------------------------------------------------
CREATE TABLE loan_applications (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT         NOT NULL,
    amount      DECIMAL(15,2)  NOT NULL,
    purpose     VARCHAR(255)   NOT NULL,
    interest_rate DECIMAL(5,2),
    term_months INT,
    status      VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    applied_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    review_note VARCHAR(255),
    CONSTRAINT fk_loan_applications_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- NOTE on demo data:
-- We intentionally do NOT insert a demo user here with a hardcoded
-- password hash. Instead, the Spring Boot backend seeds a demo user
-- automatically the first time it starts (see DataSeeder.java), using
-- Spring Security's BCryptPasswordEncoder so the hash is guaranteed to
-- be valid. Demo login after the backend's first run:
--   username: demo_user
--   password: Demo@1234
-- ---------------------------------------------------------------------
