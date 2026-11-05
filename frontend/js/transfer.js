document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireLogin();

  const user = Auth.getUser();
  document.getElementById("userGreeting").textContent = (user?.fullName || "").split(" ")[0];
  document.getElementById("logoutBtn").addEventListener("click", () => {
    Auth.clearSession();
    window.location.href = "index.html";
  });

  const fromSelect = document.getElementById("fromAccount");
  const internalModeButton = document.getElementById("internalTransferMode");
  const externalModeButton = document.getElementById("externalTransferMode");
  const internalRecipientFields = document.getElementById("internalRecipientFields");
  const externalRecipientFields = document.getElementById("externalRecipientFields");
  const transferButton = document.getElementById("transferBtn");
  let transferMode = "internal";

  function setTransferMode(mode) {
    transferMode = mode;
    const isExternal = mode === "external";
    internalRecipientFields.hidden = isExternal;
    externalRecipientFields.hidden = !isExternal;
    document.getElementById("toAccountNumber").required = !isExternal;
    externalRecipientFields.querySelectorAll("input").forEach((input) => {
      input.required = isExternal;
    });
    internalModeButton.classList.toggle("active", !isExternal);
    externalModeButton.classList.toggle("active", isExternal);
    internalModeButton.setAttribute("aria-selected", String(!isExternal));
    externalModeButton.setAttribute("aria-selected", String(isExternal));
    document.getElementById("transferSubtitle").textContent = isExternal
      ? "Enter the beneficiary bank details to record an instant demo transfer."
      : "Funds are transferred instantly between Apna Bank accounts.";
    transferButton.textContent = isExternal ? "Simulate Instant Transfer" : "Transfer Funds";
  }

  internalModeButton.addEventListener("click", () => setTransferMode("internal"));
  externalModeButton.addEventListener("click", () => setTransferMode("external"));
  document.getElementById("beneficiaryIfsc").addEventListener("input", (event) => {
    event.target.value = event.target.value.toUpperCase();
  });

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

    const btn = transferButton;
    let payload;

    if (transferMode === "external") {
      const beneficiaryAccountNumber = document.getElementById("beneficiaryAccountNumber").value.trim();
      const confirmAccountNumber = document.getElementById("confirmBeneficiaryAccountNumber").value.trim();
      if (beneficiaryAccountNumber !== confirmAccountNumber) {
        showAlert("transferAlert", "The beneficiary account numbers do not match.", "error");
        return;
      }

      payload = {
        fromAccountNumber: fromSelect.value,
        beneficiaryName: document.getElementById("beneficiaryName").value.trim(),
        beneficiaryBankName: document.getElementById("beneficiaryBankName").value.trim(),
        beneficiaryAccountNumber,
        beneficiaryIfsc: document.getElementById("beneficiaryIfsc").value.trim(),
        beneficiaryBranch: document.getElementById("beneficiaryBranch").value.trim(),
        amount: Number(document.getElementById("amount").value),
        description: document.getElementById("description").value.trim(),
      };
    } else {
      payload = {
        fromAccountNumber: fromSelect.value,
        toAccountNumber: document.getElementById("toAccountNumber").value.trim(),
        amount: Number(document.getElementById("amount").value),
        description: document.getElementById("description").value.trim(),
      };
    }

    btn.disabled = true;
    btn.textContent = "Processing...";

    try {
      const result = transferMode === "external"
        ? await Api.externalTransfer(payload)
        : await Api.transfer(payload);
      const successMessage = transferMode === "external"
        ? `Demo transfer recorded. No funds were sent to another bank. Reference: ${result.transactionRef}. New balance: ${formatCurrency(result.balanceAfter)}.`
        : `Transfer successful. Reference: ${result.transactionRef}. New balance: ${formatCurrency(result.balanceAfter)}.`;
      showAlert("transferAlert", successMessage, "success");
      showTransactionReceiptActions("transactionReceiptActions", result, {
        accountNumber: payload.fromAccountNumber,
        description: payload.description || (transferMode === "external" ? "Simulated external transfer" : "Fund transfer"),
      });
      document.getElementById("transferForm").reset();
    } catch (err) {
      showAlert("transferAlert", err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = transferMode === "external" ? "Simulate Instant Transfer" : "Transfer Funds";
    }
  });
});
