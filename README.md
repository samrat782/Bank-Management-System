# SecureTrust Bank — Banking Management System

A full-stack banking management system inspired by net-banking portals like
HDFC Bank's. Built with **Spring Boot** (backend REST API), **MySQL**
(database), and plain **HTML/CSS/JavaScript** (frontend) — no build tools
required for the frontend.

> **Note on branding:** this project uses a fictional bank name
> ("SecureTrust Bank") and an original blue/red color theme inspired by
> Indian private-bank net-banking portals. It does not use HDFC Bank's
> actual name, logo, or trademarks, to avoid trademark/copyright issues —
> you're free to re-theme it with your own bank name and colors in
> `frontend/css/style.css`.

## Project structure

```
banking-management-system/
├── database/
│   └── schema.sql              # MySQL tables (run this first)
├── backend/                    # Spring Boot REST API (Java 17, Maven)
│   ├── pom.xml
│   └── src/main/java/com/securetrust/banking/
│       ├── BankingApplication.java
│       ├── config/              # Security, CORS, demo-data seeding
│       ├── controller/          # REST endpoints
│       ├── dto/                 # Request/response objects
│       ├── exception/           # Global error handling
│       ├── model/                # JPA entities (User, Account, Transaction)
│       ├── repository/          # Spring Data JPA repositories
│       ├── security/            # JWT filter/util
│       └── service/              # Business logic
└── frontend/                   # Plain HTML/CSS/JS net-banking UI
    ├── index.html               # Login
    ├── register.html            # Open an account
    ├── dashboard.html           # Account overview + recent transactions
    ├── transfer.html            # Fund transfer
    ├── deposit.html / withdraw.html
    ├── transactions.html        # Full statement
    ├── css/style.css
    └── js/
```

## What it can do

- Register a new customer (a savings account is auto-created)
- Secure login with BCrypt passwords and JWT sessions
- View all accounts and balances on a dashboard
- Deposit / withdraw cash
- Transfer funds between accounts (with balance checks)
- View full transaction history / statement per account
- Admin console for customers, accounts, transaction search, loan decisions, and bank totals
- Separate customer and administrator login modes; the admin overview includes today's transaction count
- Customer loan applications with status tracking

## Prerequisites

Install these once on your machine:

1. **Java 17+ JDK** — https://adoptium.net
2. **Maven** (or use the Maven wrapper if you add one — see note below)
3. **MySQL Server 8+** — https://dev.mysql.com/downloads/mysql/
4. **VS Code** with these extensions:
   - *Extension Pack for Java* (Microsoft)
   - *Spring Boot Extension Pack* (Microsoft)
   - *Live Server* (Ritwick Dey) — to serve the frontend

## Step 1 — Create the database

Open a terminal (or MySQL Workbench) and run:

```bash
mysql -u root -p < database/schema.sql
```

This creates the `banking_management_system` database with the `users`,
`accounts`, and `transactions` tables. No demo rows are inserted here — the
backend seeds a demo login automatically the first time it starts (see
Step 2), so the password hash is guaranteed to be valid.

## Step 2 — Configure and run the backend

1. Open the **`backend/`** folder in VS Code (`File → Open Folder`).
2. Edit `src/main/resources/application.properties` and set your own
   MySQL username/password:
   ```properties
   spring.datasource.username=root
   spring.datasource.password=your_mysql_password
   ```
3. Run the app one of two ways:
   - **In VS Code:** open `BankingApplication.java` and click **Run** above
     the `main` method (needs the Java + Spring Boot extensions).
   - **From a terminal:**
     ```bash
     cd backend
     mvn spring-boot:run
     ```
4. Wait for the log line `Started BankingApplication...` and the seeded
   demo-user message. The API is now live at `http://localhost:8080`.

Demo login the seeder creates for you:
```
User ID:  demo_user
Password: Demo@1234
```

Administrator login:
```
User ID:  bank_admin
Password: Admin@1234
```

The seeded administrator is for local development only. Change its password
before sharing or deploying the application. After the first login, the
administrator console is available from the dashboard's **Admin console** link.

### Backend API quick reference

| Method | Endpoint                              | Auth required | Description               |
|--------|----------------------------------------|:--:|----------------------------|
| POST   | `/api/auth/register`                  | No | Create a customer and receive JWT |
| POST   | `/api/auth/login`                     | No | Verify credentials and receive JWT |
| GET    | `/api/accounts/my`                    | Yes | List your accounts         |
| GET    | `/api/accounts/{accountNumber}`       | Yes | Account details/balance    |
| POST   | `/api/transactions/deposit`           | Yes | Deposit into an account    |
| POST   | `/api/transactions/withdraw`          | Yes | Withdraw from an account   |
| POST   | `/api/transactions/transfer`          | Yes | Transfer between accounts  |
| GET    | `/api/transactions/history/{accNum}`  | Yes | Full transaction history   |
| GET    | `/api/admin/stats`                    | Admin | Overall bank statistics   |
| GET/POST | `/api/admin/customers`               | Admin | List or create customers  |
| DELETE | `/api/admin/customers/{username}`     | Admin | Deactivate a customer     |
| POST   | `/api/admin/customers/{username}/restore` | Admin | Reactivate a customer |
| GET/POST | `/api/admin/accounts`                | Admin | List or open accounts     |
| POST   | `/api/admin/accounts/{number}/freeze` | Admin | Freeze an account       |
| POST   | `/api/admin/accounts/{number}/unfreeze` | Admin | Unfreeze an account   |
| POST   | `/api/admin/accounts/{number}/close` | Admin | Close a zero-balance account |
| GET    | `/api/admin/transactions?search=...`  | Admin | Search transaction ledger |
| GET    | `/api/admin/loans`                    | Admin | Review loan applications |
| POST   | `/api/admin/loans/{id}/decision`      | Admin | Approve or reject a loan  |
| GET/POST | `/api/loans/my` and `/api/loans`     | Customer | Submit or view own loans |

Authenticated requests need header: `Authorization: Bearer <token>`
(the frontend handles this automatically once you're logged in).

## Step 3 — Run the frontend

The frontend is plain HTML/CSS/JS — no npm install, no build step.

**Option A — VS Code Live Server (recommended):**
1. Open the **`frontend/`** folder in VS Code (you can open it in a second
   VS Code window alongside the backend, or open the whole project root
   and just navigate into `frontend/`).
2. Right-click `index.html` → **Open with Live Server**.
3. Your browser opens the login page (usually `http://127.0.0.1:5500`).

**Option B — just double-click `index.html`:**
This also works (the app calls the backend directly at
`http://localhost:8080`), but Live Server is smoother for auto-reload
while you edit.

> If you use a different Live Server port, or host the frontend elsewhere,
> add that origin to `app.cors.allowed-origins` in the backend's
> `application.properties` so the browser isn't blocked by CORS.

## Step 4 — Log in and explore

1. Go to the login page and sign in with `demo_user` / `Demo@1234`
   (or click **Open an account** to register your own).
2. From the dashboard you can deposit, withdraw, transfer funds between
   accounts, and view your full statement.

## Opening everything at once in VS Code

The simplest single-window setup:
1. `File → Open Folder` → select the project root (`banking-management-system/`).
2. Use the built-in terminal to `cd backend && mvn spring-boot:run`.
3. In the Explorer, right-click `frontend/index.html` → **Open with Live Server**.

Both processes (backend on :8080, frontend on :5500) now run side by side,
and the site behaves like a real net-banking portal talking to a real
MySQL-backed API.

## Troubleshooting

- **"Could not reach the backend"** on the login page → the Spring Boot
  app isn't running, or is on a different port than 8080. Check the
  terminal running `mvn spring-boot:run` for errors.
- **CORS error in the browser console** → add your frontend's exact origin
  (protocol + host + port) to `app.cors.allowed-origins` and restart the
  backend.
- **`Access denied for user 'root'@'localhost'`** → your MySQL
  username/password in `application.properties` doesn't match your local
  MySQL install; update it and restart.
- **Port 8080 already in use** → change `server.port` in
  `application.properties` and update `API_BASE_URL` in
  `frontend/js/api.js` to match.

## Security notes

This is a learning/demo project. Before using anything like it in
production you'd want to add: HTTPS, refresh tokens, rate limiting on
login, audit logging, stronger secret management (the JWT secret is
currently in plain text in `application.properties`), and two-factor
authentication — none of which real banks skip.
