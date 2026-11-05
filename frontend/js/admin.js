
document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireAdmin();
  if (Auth.getUser()?.role !== "ADMIN") return;

  const admin = Auth.getUser();
  document.getElementById("adminName").textContent = admin.fullName || admin.username;
  document.getElementById("adminAvatar").textContent = initials(admin.fullName || admin.username);
  document.getElementById("adminDate").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    Auth.clearSession();
    window.location.href = "index.html";
  });
  setupSidebar();
  setupTabs();
  setupForms();
  setupActions();
  await Promise.all([loadStats(), loadLoans(true)]);
});

function setupSidebar() {
  const menuButton = document.getElementById("mobileMenuBtn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  menuButton.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");
  });
  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  });
}

function setupTabs() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => openAdminView(button.dataset.view));
  });
  document.querySelectorAll("[data-open-view]").forEach((button) => {
    button.addEventListener("click", () => openAdminView(button.dataset.openView));
  });
}

function openAdminView(view) {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== view;
  });

  if (view === "customers") loadCustomers();
  if (view === "accounts") loadAccounts();
  if (view === "transactions") loadTransactions();
  if (view === "loans") loadLoans();
}

function setupForms() {
  document.getElementById("customerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    try {
      await Api.adminCreateCustomer(payload);
      form.reset();
      notifyAdmin("Customer created and savings account opened.", "success");
      await Promise.all([loadCustomers(), loadStats()]);
    } catch (error) {
      notifyAdmin(error.message);
    }
  });

  document.getElementById("accountForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await Api.adminCreateAccount({
        username: document.getElementById("accountCustomer").value,
        accountType: document.getElementById("accountType").value,
      });
      notifyAdmin("Account opened.", "success");
      await Promise.all([loadAccounts(), loadStats()]);
    } catch (error) {
      notifyAdmin(error.message);
    }
  });

  document.getElementById("transactionSearchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    loadTransactions(document.getElementById("transactionSearch").value.trim());
  });
  document.getElementById("clearTransactionSearch").addEventListener("click", () => {
    document.getElementById("transactionSearch").value = "";
    loadTransactions();
  });
}

function setupActions() {
  document.addEventListener("click", async (event) => {
    const refreshButton = event.target.closest("[data-refresh]");
    if (refreshButton) {
      if (refreshButton.dataset.refresh === "customers") await loadCustomers();
      if (refreshButton.dataset.refresh === "accounts") await loadAccounts();
      if (refreshButton.dataset.refresh === "loans") await loadLoans();
      return;
    }

    const customerButton = event.target.closest("[data-remove-customer]");
    if (customerButton) {
      const username = customerButton.dataset.removeCustomer;
      if (!window.confirm(`Deactivate customer ${username}? Their transaction history will be retained.`)) return;
      try {
        await Api.adminRemoveCustomer(username);
        notifyAdmin("Customer deactivated.", "success");
        await Promise.all([loadCustomers(), loadStats()]);
      } catch (error) {
        notifyAdmin(error.message);
      }
      return;
    }

    const restoreButton = event.target.closest("[data-restore-customer]");
    if (restoreButton) {
      try {
        await Api.adminRestoreCustomer(restoreButton.dataset.restoreCustomer);
        notifyAdmin("Customer reactivated.", "success");
        await Promise.all([loadCustomers(), loadStats()]);
      } catch (error) {
        notifyAdmin(error.message);
      }
      return;
    }

    const accountButton = event.target.closest("[data-account-action]");
    if (accountButton) {
      const { accountAction: action, accountNumber } = accountButton.dataset;
      if (action === "close" && !window.confirm(`Close account ${accountNumber}? This cannot be undone.`)) return;
      try {
        await Api.adminAccountAction(accountNumber, action);
        notifyAdmin(`Account ${action === "close" ? "closed" : action === "freeze" ? "frozen" : "unfrozen"}.`, "success");
        await Promise.all([loadAccounts(), loadStats()]);
      } catch (error) {
        notifyAdmin(error.message);
      }
      return;
    }

    const decisionButton = event.target.closest("[data-loan-decision]");
    if (decisionButton) {
      const { loanDecision: decision, loanId } = decisionButton.dataset;
      if (!window.confirm(`${decision === "APPROVED" ? "Approve" : "Reject"} this loan application?`)) return;
      try {
        await Api.adminDecideLoan(loanId, { decision, note: "" });
        notifyAdmin(`Loan application ${decision.toLowerCase()}.`, "success");
        await Promise.all([loadLoans(), loadStats()]);
      } catch (error) {
        notifyAdmin(error.message);
      }
    }
  });
}

async function loadStats() {
  try {
    const stats = await Api.adminStats();
    const items = [
      ["Active customers", stats.activeCustomers],
      ["Inactive customers", stats.inactiveCustomers],
      ["Active accounts", stats.activeAccounts],
      ["Frozen accounts", stats.frozenAccounts],
      ["Closed accounts", stats.closedAccounts],
      ["Transactions", stats.transactionCount],
      ["Transactions today", stats.todayTransactions],
      ["Pending loans", stats.pendingLoanApplications],
      ["Total account balances", formatCurrency(stats.totalAccountBalances)],
    ];
    document.getElementById("adminStats").innerHTML = items.map(([label, value]) => `
      <article class="admin-stat"><div class="admin-stat-label">${escapeHTML(label)}</div><div class="admin-stat-value">${escapeHTML(value)}</div></article>
    `).join("");
  } catch (error) {
    notifyAdmin(error.message);
    document.getElementById("adminStats").innerHTML = `<div class="empty-state">Could not load bank statistics.</div>`;
  }
}

async function loadCustomers() {
  const container = document.getElementById("customerTable");
  container.innerHTML = `<div class="empty-state">Loading customers...</div>`;
  try {
    const customers = await Api.adminCustomers();
    const active = customers.filter((customer) => customer.status === "ACTIVE");
    const options = document.getElementById("accountCustomer");
    options.innerHTML = active.length
      ? active.map((customer) => `<option value="${escapeHTML(customer.username)}">${escapeHTML(customer.fullName)} (${escapeHTML(customer.username)})</option>`).join("")
      : `<option value="">No active customers</option>`;
    options.disabled = active.length === 0;
    renderTable(container, ["Customer", "Username", "Email", "Phone", "Status", "Added", "Action"], customers.map((customer) => `
      <tr>
        <td>${escapeHTML(customer.fullName)}</td><td>${escapeHTML(customer.username)}</td><td>${escapeHTML(customer.email)}</td>
        <td>${escapeHTML(customer.phoneNumber)}</td><td>${statusTag(customer.status)}</td><td>${escapeHTML(formatDateTime(customer.createdAt))}</td>
        <td>${customer.status === "ACTIVE" ? `<button class="admin-action danger" data-remove-customer="${escapeHTML(customer.username)}">Deactivate</button>` : `<button class="admin-action" data-restore-customer="${escapeHTML(customer.username)}">Reactivate</button>`}</td>
      </tr>
    `));
  } catch (error) {
    container.innerHTML = `<div class="empty-state">Could not load customers.</div>`;
    notifyAdmin(error.message);
  }
}

async function loadAccounts() {
  const container = document.getElementById("accountTable");
  container.innerHTML = `<div class="empty-state">Loading accounts...</div>`;
  try {
    const accounts = await Api.adminAccounts();
    renderTable(container, ["Account", "Customer", "Username", "Type", "Balance", "Status", "Actions"], accounts.map((account) => {
      const actions = account.status === "CLOSED" ? "-" : `
        ${account.status === "ACTIVE" ? actionButton("freeze", account.accountNumber) : actionButton("unfreeze", account.accountNumber)}
        ${actionButton("close", account.accountNumber)}
      `;
      return `<tr><td>${escapeHTML(account.accountNumber)}</td><td>${escapeHTML(account.customerName)}</td><td>${escapeHTML(account.username)}</td><td>${escapeHTML(account.accountType)}</td><td>${escapeHTML(formatCurrency(account.balance))}</td><td>${statusTag(account.status)}</td><td class="admin-actions">${actions}</td></tr>`;
    }));
  } catch (error) {
    container.innerHTML = `<div class="empty-state">Could not load accounts.</div>`;
    notifyAdmin(error.message);
  }
}

async function loadTransactions(search = "") {
  const container = document.getElementById("transactionTable");
  container.innerHTML = `<div class="empty-state">Loading transactions...</div>`;
  try {
    const transactions = await Api.adminTransactions(search);
    renderTable(container, ["Date", "Reference", "Type", "From", "To", "Description", "Amount", "Status"], transactions.map((transaction) => `
      <tr><td>${escapeHTML(formatDateTime(transaction.createdAt))}</td><td>${escapeHTML(transaction.transactionRef)}</td>
      <td>${escapeHTML(transaction.type)}</td><td>${escapeHTML(transaction.fromAccountNumber || "-")}</td>
      <td>${escapeHTML(transaction.toAccountNumber || "-")}</td><td>${escapeHTML(transaction.description || "-")}</td>
      <td>${escapeHTML(formatCurrency(transaction.amount))}</td><td>${statusTag(transaction.status)}</td></tr>
    `));
  } catch (error) {
    container.innerHTML = `<div class="empty-state">Could not load transactions.</div>`;
    notifyAdmin(error.message);
  }
}

async function loadLoans(overview = false) {
  const container = document.getElementById(overview ? "overviewLoans" : "loanTable");
  container.innerHTML = `<div class="empty-state">Loading applications...</div>`;
  try {
    const loans = await Api.adminLoans();
    const rows = (overview ? loans.filter((loan) => loan.status === "PENDING") : loans).map((loan) => `
      <tr><td>${escapeHTML(loan.customerName)}</td><td>${escapeHTML(loan.username)}</td><td>${escapeHTML(formatCurrency(loan.amount))}</td>
      <td>${escapeHTML(loan.purpose)}</td><td>${escapeHTML(loan.interestRate == null ? "-" : `${loan.interestRate}%`)}</td>
      <td>${escapeHTML(loan.termMonths == null ? "-" : `${loan.termMonths} months`)}</td><td>${escapeHTML(loan.monthlyPayment == null ? "-" : formatCurrency(loan.monthlyPayment))}</td>
      <td>${statusTag(loan.status)}</td><td>${escapeHTML(formatDateTime(loan.appliedAt))}</td>
      <td>${escapeHTML(loan.reviewNote || "-")}</td><td>${loan.status === "PENDING" ? `
        <div class="admin-actions"><button class="admin-action approve" data-loan-id="${loan.id}" data-loan-decision="APPROVED">Approve</button>
        <button class="admin-action danger" data-loan-id="${loan.id}" data-loan-decision="REJECTED">Reject</button></div>
      ` : "-"}</td></tr>
    `);
    renderTable(container, ["Customer", "Username", "Amount", "Purpose", "Rate", "Term", "Est. monthly", "Status", "Applied", "Review note", "Decision"], rows);
  } catch (error) {
    container.innerHTML = `<div class="empty-state">Could not load applications.</div>`;
    notifyAdmin(error.message);
  }
}

function renderTable(container, headings, rows) {
  container.innerHTML = rows.length
    ? `<table class="txn-table"><thead><tr>${headings.map((heading) => `<th>${escapeHTML(heading)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`
    : `<div class="empty-state">No records found.</div>`;
}

function actionButton(action, accountNumber) {
  const label = action === "freeze" ? "Freeze" : action === "unfreeze" ? "Unfreeze" : "Close";
  return `<button class="admin-action ${action === "close" ? "danger" : ""}" data-account-action="${action}" data-account-number="${escapeHTML(accountNumber)}">${label}</button>`;
}

function statusTag(status) {
  return `<span class="admin-status status-${escapeHTML(String(status).toLowerCase())}">${escapeHTML(status)}</span>`;
}

function notifyAdmin(message, type = "error") {
  showAlert("adminAlert", message, type);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}