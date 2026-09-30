/* =====================================================================
   SecureTrust Bank — api.js
   Small wrapper around fetch() that talks to the Spring Boot backend,
   attaches the JWT token automatically, and normalizes error handling.
   Change API_BASE_URL if your backend runs on a different host/port.
   ===================================================================== */

const API_BASE_URL = "http://localhost:8080/api";

const Auth = {
  getToken() {
    return localStorage.getItem("stb_token");
  },
  getUser() {
    const raw = localStorage.getItem("stb_user");
    return raw ? JSON.parse(raw) : null;
  },
  setSession(authResponse) {
    localStorage.setItem("stb_token", authResponse.token);
    localStorage.setItem(
      "stb_user",
      JSON.stringify({
        username: authResponse.username,
        fullName: authResponse.fullName,
        email: authResponse.email,
        role: authResponse.role,
      })
    );
  },
  clearSession() {
    localStorage.removeItem("stb_token");
    localStorage.removeItem("stb_user");
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = "index.html";
    }
  },
  requireAdmin() {
    this.requireLogin();
    if (this.getUser()?.role !== "ADMIN") {
      window.location.href = "dashboard.html";
    }
  },
};

/**
 * Core request helper.
 * @param {string} path - e.g. "/auth/login"
 * @param {object} options - { method, body }
 */
async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = Auth.getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  let response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (networkError) {
    throw new Error(
      "Could not reach the backend at " +
        API_BASE_URL +
        ". Is the Spring Boot server running on port 8080?"
    );
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) {
      Auth.clearSession();
    }
    const message = (data && data.message) || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

const Api = {
  register(payload) {
    return apiRequest("/auth/register", { method: "POST", body: payload });
  },
  login(payload) {
    return apiRequest("/auth/login", { method: "POST", body: payload });
  },
  myAccounts() {
    return apiRequest("/accounts/my");
  },
  accountDetails(accountNumber) {
    return apiRequest("/accounts/" + encodeURIComponent(accountNumber));
  },
  deposit(payload) {
    return apiRequest("/transactions/deposit", { method: "POST", body: payload });
  },
  withdraw(payload) {
    return apiRequest("/transactions/withdraw", { method: "POST", body: payload });
  },
  transfer(payload) {
    return apiRequest("/transactions/transfer", { method: "POST", body: payload });
  },
  history(accountNumber) {
    return apiRequest("/transactions/history/" + encodeURIComponent(accountNumber));
  },
  adminStats() {
    return apiRequest("/admin/stats");
  },
  adminCustomers() {
    return apiRequest("/admin/customers");
  },
  adminCreateCustomer(payload) {
    return apiRequest("/admin/customers", { method: "POST", body: payload });
  },
  adminRemoveCustomer(username) {
    return apiRequest("/admin/customers/" + encodeURIComponent(username), { method: "DELETE" });
  },
  adminRestoreCustomer(username) {
    return apiRequest("/admin/customers/" + encodeURIComponent(username) + "/restore", { method: "POST" });
  },
  adminAccounts() {
    return apiRequest("/admin/accounts");
  },
  adminCreateAccount(payload) {
    return apiRequest("/admin/accounts", { method: "POST", body: payload });
  },
  adminAccountAction(accountNumber, action) {
    return apiRequest("/admin/accounts/" + encodeURIComponent(accountNumber) + "/" + action, { method: "POST" });
  },
  adminTransactions(search = "") {
    return apiRequest("/admin/transactions?search=" + encodeURIComponent(search));
  },
  adminLoans() {
    return apiRequest("/admin/loans");
  },
  adminDecideLoan(id, payload) {
    return apiRequest("/admin/loans/" + id + "/decision", { method: "POST", body: payload });
  },
  myLoanApplications() {
    return apiRequest("/loans/my");
  },
  applyForLoan(payload) {
    return apiRequest("/loans", { method: "POST", body: payload });
  },
};

/* ---------- Small shared UI helpers ---------- */

function formatCurrency(amount) {
  const num = Number(amount);
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function showAlert(elementId, message, type = "error") {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = "alert show alert-" + type;
}

function hideAlert(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.className = "alert";
}

function initials(fullName) {
  if (!fullName) return "U";
  return fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
