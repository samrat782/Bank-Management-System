document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireLogin();

  const user = Auth.getUser();
  document.getElementById("userGreeting").textContent = (user?.fullName || "").split(" ")[0];
  document.getElementById("logoutBtn").addEventListener("click", () => {
    Auth.clearSession();
    window.location.href = "index.html";
  });

  const accountSelect = document.getElementById("accountSelect");

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
  hideAlert("txnAlert");
  const container = document.getElementById("txnContainer");
  container.innerHTML = `<div class="empty-state">Loading...</div>`;

  try {
    const txns = await Api.history(accountNumber);

    if (txns.length === 0) {
      container.innerHTML = `<div class="empty-state">No transactions found for this account yet.</div>`;
      return;
    }

    const rows = txns
      .map((t) => {
        const pillClass = t.type === "DEPOSIT" ? "pill-deposit" : t.type === "WITHDRAW" ? "pill-withdraw" : "pill-transfer";
        const isOutgoing = t.fromAccountNumber === accountNumber;
        const amountClass = isOutgoing ? "amount-debit" : "amount-credit";
        const sign = isOutgoing ? "-" : "+";

        return `
          <tr>
            <td>${formatDateTime(t.createdAt)}</td>
            <td><span class="pill ${pillClass}">${t.type}</span></td>
            <td>${t.transactionRef}</td>
            <td>${t.description || "-"}</td>
            <td>${t.fromAccountNumber || "-"} ${t.type === "TRANSFER" ? "&rarr; " + t.toAccountNumber : ""}</td>
            <td class="${amountClass}">${sign} ${formatCurrency(t.amount)}</td>
            <td>${formatCurrency(t.balanceAfter)}</td>
          </tr>
        `;
      })
      .join("");

    container.innerHTML = `
      <table class="txn-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Reference</th>
            <th>Description</th>
            <th>Account</th>
            <th>Amount</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch (err) {
    showAlert("txnAlert", err.message, "error");
    container.innerHTML = "";
  }
}
