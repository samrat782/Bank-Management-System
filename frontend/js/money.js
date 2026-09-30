document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireLogin();

  const mode = window.STB_MODE === "withdraw" ? "withdraw" : "deposit";
  const user = Auth.getUser();
  document.getElementById("userGreeting").textContent = (user?.fullName || "").split(" ")[0];
  document.getElementById("logoutBtn").addEventListener("click", () => {
    Auth.clearSession();
    window.location.href = "index.html";
  });

  const accountSelect = document.getElementById("accountNumber");

  try {
    const accounts = await Api.myAccounts();
    accountSelect.innerHTML = accounts
      .map(
        (acc) =>
          `<option value="${acc.accountNumber}">${acc.accountType} — ${acc.accountNumber} (${formatCurrency(acc.balance)})</option>`
      )
      .join("");
  } catch (err) {
    showAlert("formAlert", err.message, "error");
  }

  document.getElementById("moneyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert("formAlert");

    const btn = document.getElementById("submitBtn");
    const payload = {
      accountNumber: accountSelect.value,
      amount: Number(document.getElementById("amount").value),
      description: document.getElementById("description").value.trim(),
    };

    btn.disabled = true;
    btn.textContent = "Processing...";

    try {
      const result = mode === "withdraw" ? await Api.withdraw(payload) : await Api.deposit(payload);
      const verb = mode === "withdraw" ? "Withdrawal" : "Deposit";
      showAlert(
        "formAlert",
        `${verb} successful. Reference: ${result.transactionRef}. New balance: ${formatCurrency(result.balanceAfter)}.`,
        "success"
      );
      document.getElementById("moneyForm").reset();
    } catch (err) {
      showAlert("formAlert", err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = mode === "withdraw" ? "Withdraw Funds" : "Deposit Funds";
    }
  });
});
