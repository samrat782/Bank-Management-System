document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireLogin();

  const user = Auth.getUser();
  document.getElementById("userGreeting").textContent = (user?.fullName || "").split(" ")[0];
  document.getElementById("logoutBtn").addEventListener("click", () => {
    Auth.clearSession();
    window.location.href = "index.html";
  });

  const fromSelect = document.getElementById("fromAccount");

  try {
    const accounts = await Api.myAccounts();
    fromSelect.innerHTML = accounts
      .map(
        (acc) =>
          `<option value="${acc.accountNumber}">${acc.accountType} — ${acc.accountNumber} (${formatCurrency(acc.balance)})</option>`
      )
      .join("");
  } catch (err) {
    showAlert("transferAlert", err.message, "error");
  }

  document.getElementById("transferForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert("transferAlert");

    const btn = document.getElementById("transferBtn");
    const payload = {
      fromAccountNumber: fromSelect.value,
      toAccountNumber: document.getElementById("toAccountNumber").value.trim(),
      amount: Number(document.getElementById("amount").value),
      description: document.getElementById("description").value.trim(),
    };

    btn.disabled = true;
    btn.textContent = "Processing...";

    try {
      const result = await Api.transfer(payload);
      showAlert(
        "transferAlert",
        `Transfer successful. Reference: ${result.transactionRef}. New balance: ${formatCurrency(result.balanceAfter)}.`,
        "success"
      );
      document.getElementById("transferForm").reset();
    } catch (err) {
      showAlert("transferAlert", err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Transfer Funds";
    }
  });
});
