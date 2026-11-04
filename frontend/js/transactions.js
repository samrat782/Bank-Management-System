let accountLoadSequence = 0;
let statementQuerySequence = 0;

document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireLogin();

  const user = Auth.getUser();
  document.getElementById("userGreeting").textContent = (user?.fullName || "").split(" ")[0];
  document.getElementById("logoutBtn").addEventListener("click", () => {
    Auth.clearSession();
    window.location.href = "index.html";
  });

  const accountSelect = document.getElementById("accountSelect");
  document.getElementById("applyFiltersBtn").addEventListener("click", applyStatementFilters);
  document.getElementById("clearFiltersBtn").addEventListener("click", () => {
    document.getElementById("dateFrom").value = "";
    document.getElementById("dateTo").value = "";
    document.getElementById("typeFilter").value = "ALL";
    loadStatement(accountSelect.value);
  });
  document.getElementById("typeFilter").addEventListener("change", () => loadStatement(accountSelect.value));
  document.getElementById("downloadStatementBtn").addEventListener("click", downloadStatementPdf);

  try {
    const accounts = await Api.myAccounts();

    if (accounts.length === 0) {
      document.getElementById("txnContainer").innerHTML = `<div class="empty-state">No accounts found.</div>`;
      return;
    }

    accountSelect.innerHTML = accounts
      .map((acc) => `<option value="${acc.accountNumber}">${acc.accountType} — ${acc.accountNumber}</option>`)
      .join("");

    accountSelect.addEventListener("change", () => loadHistory(accountSelect.value));
    await loadHistory(accountSelect.value);
  } catch (err) {
    showAlert("txnAlert", err.message, "error");
  }
});

async function loadHistory(accountNumber) {
  const loadSequence = ++accountLoadSequence;
  hideAlert("txnAlert");
  const container = document.getElementById("txnContainer");
  container.innerHTML = `<div class="empty-state">Loading...</div>`;
  document.getElementById("miniStatementContainer").innerHTML = `<div class="empty-state">Loading...</div>`;
  document.getElementById("downloadStatementBtn").disabled = true;

  try {
    const [miniStatement, statement] = await Promise.all([
      Api.miniStatement(accountNumber),
      Api.statement(accountNumber, getStatementFilters()),
    ]);
    if (loadSequence !== accountLoadSequence || document.getElementById("accountSelect").value !== accountNumber) return;
    window.statementState = { accountNumber, miniStatement, statement };
    document.getElementById("downloadStatementBtn").disabled = false;
    renderMiniStatement();
    renderStatement();
  } catch (err) {
    showAlert("txnAlert", err.message, "error");
    container.innerHTML = "";
    document.getElementById("miniStatementContainer").innerHTML = `<div class="empty-state">Statement unavailable.</div>`;
  }
}

function applyStatementFilters() {
  const from = document.getElementById("dateFrom").value;
  const to = document.getElementById("dateTo").value;
  if (from && to && from > to) {
    showAlert("txnAlert", "The start date must be on or before the end date.", "error");
    return;
  }
  loadStatement(document.getElementById("accountSelect").value);
}

function renderMiniStatement() {
  const { miniStatement, accountNumber } = window.statementState;
  const recent = miniStatement;
  const miniContainer = document.getElementById("miniStatementContainer");
  if (!recent.length) {
    miniContainer.innerHTML = `<div class="empty-state">No transactions found for this account yet.</div>`;
    return;
  }

  miniContainer.innerHTML = `<div class="mini-statement-list">${recent.map((transaction) => {
    const delta = transactionDelta(transaction, accountNumber);
    const amountClass = delta < 0 ? "amount-debit" : "amount-credit";
    const sign = delta < 0 ? "−" : "+";
    return `<div class="mini-statement-row">
      <div><strong>${escapeHTML(transaction.description || transaction.type)}</strong><small>${formatDateTime(transaction.createdAt)} · ${escapeHTML(transaction.type)}</small></div>
      <strong class="${amountClass}">${sign} ${formatCurrency(Math.abs(delta))}</strong>
    </div>`;
  }).join("")}</div>`;
}

async function loadStatement(accountNumber) {
  if (!accountNumber) return;
  const querySequence = ++statementQuerySequence;
  hideAlert("txnAlert");
  const container = document.getElementById("txnContainer");
  container.innerHTML = `<div class="empty-state">Loading...</div>`;
  try {
    const statement = await Api.statement(accountNumber, getStatementFilters());
    if (querySequence !== statementQuerySequence
        || document.getElementById("accountSelect").value !== accountNumber
        || window.statementState?.accountNumber !== accountNumber) return;
    window.statementState.statement = statement;
    renderStatement();
  } catch (err) {
    showAlert("txnAlert", err.message, "error");
    container.innerHTML = "";
  }
}

function getStatementFilters() {
  return {
    fromDate: document.getElementById("dateFrom").value,
    toDate: document.getElementById("dateTo").value,
    type: document.getElementById("typeFilter").value,
  };
}

function renderStatement() {
  const state = window.statementState;
  const statement = state?.statement;
  if (!statement) return;

  const visibleTransactions = statement.transactions;
  document.getElementById("openingBalance").textContent = formatCurrency(statement.openingBalance);
  document.getElementById("closingBalance").textContent = formatCurrency(statement.closingBalance);
  document.getElementById("statementCount").textContent = String(visibleTransactions.length);
  document.getElementById("statementPeriodLabel").textContent =
    `Account ${statement.accountNumber} · ${statement.fromDate || "All dates"} to ${statement.toDate || "Today"}`;

  const container = document.getElementById("txnContainer");
  if (!visibleTransactions.length) {
    container.innerHTML = `<div class="empty-state">No transactions match these filters.</div>`;
    return;
  }

  const rows = visibleTransactions.map((transaction) => renderTransactionRow(transaction, state.accountNumber)).join("");
  container.innerHTML = `<div class="table-responsive"><table class="txn-table">
    <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Description</th><th>Account</th><th>Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function renderTransactionRow(transaction, accountNumber) {
  const delta = transactionDelta(transaction, accountNumber);
  const amountClass = delta < 0 ? "amount-debit" : "amount-credit";
  const sign = delta < 0 ? "−" : "+";
  const pillClass = transaction.type === "DEPOSIT" ? "pill-deposit" : transaction.type === "WITHDRAW" ? "pill-withdraw" : "pill-transfer";
  const accountDetails = transaction.type === "EXTERNAL_TRANSFER"
    ? `${escapeHTML(transaction.fromAccountNumber || "-")} &rarr; ${escapeHTML(transaction.toAccountNumber || "-")}<br><small>${escapeHTML(transaction.beneficiaryName || "")}, ${escapeHTML(transaction.beneficiaryBankName || "")} · ${escapeHTML(transaction.beneficiaryIfsc || "")} · ${escapeHTML(transaction.beneficiaryBranch || "")}</small>`
    : `${escapeHTML(transaction.fromAccountNumber || "-")}${transaction.type === "TRANSFER" ? " &rarr; " + escapeHTML(transaction.toAccountNumber || "-") : ""}`;
  return `<tr>
    <td>${formatDateTime(transaction.createdAt)}</td>
    <td><span class="pill ${pillClass}">${escapeHTML(transaction.type)}</span>${transaction.status === "SIMULATED" ? "<br><small>Demo</small>" : ""}</td>
    <td>${escapeHTML(transaction.transactionRef)}</td>
    <td>${escapeHTML(transaction.description || "-")}</td>
    <td>${accountDetails}</td>
    <td class="${amountClass}">${sign} ${formatCurrency(Math.abs(delta))}</td>
  </tr>`;
}

function transactionDelta(transaction, accountNumber) {
  const amount = Number(transaction.amount) || 0;
  if (transaction.fromAccountNumber === accountNumber) return -amount;
  if (transaction.toAccountNumber === accountNumber) return amount;
  return 0;
}

function downloadStatementPdf() {
  if (!window.statementState) return;
  const previousTitle = document.title;
  document.title = `Apna Bank Statement ${window.statementState.accountNumber}`;
  window.addEventListener("afterprint", () => { document.title = previousTitle; }, { once: true });
  window.print();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}
