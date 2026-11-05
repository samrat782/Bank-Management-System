document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireLogin();
  const user = Auth.getUser();
  if (user?.role !== "CUSTOMER") {
    window.location.href = user?.role === "ADMIN" ? "admin.html" : "index.html";
    return;
  }

  document.getElementById("billUserName").textContent = user.fullName || user.username;
  document.getElementById("billAvatar").textContent = initials(user.fullName || user.username);
  document.getElementById("logoutBtn").addEventListener("click", () => {
    Auth.clearSession();
    window.location.href = "index.html";
  });

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

  const providers = {
    Electricity: ["BESCOM", "Tata Power", "Adani Electricity"],
    Water: ["Bangalore Water Supply (BWSSB)", "Delhi Jal Board", "Chennai Metro Water"],
    "Piped gas": ["Indraprastha Gas", "Mahanagar Gas", "Adani Total Gas"],
    Broadband: ["Airtel Xstream Fiber", "JioFiber", "ACT Fibernet"],
    "Mobile postpaid": ["Airtel Postpaid", "Jio Postpaid", "Vi Postpaid"],
  };

  const categorySelect = document.getElementById("billCategory");
  const providerSelect = document.getElementById("billProvider");
  const accountSelect = document.getElementById("billAccount");
  const billForm = document.getElementById("billForm");
  const review = document.getElementById("billReview");
  const receipt = document.getElementById("billReceipt");

  categorySelect.addEventListener("change", () => {
    const categoryProviders = providers[categorySelect.value] || [];
    providerSelect.innerHTML = categoryProviders.length
      ? `<option value="">Choose a provider</option>${categoryProviders.map((provider) => `<option value="${escapeBillHTML(provider)}">${escapeBillHTML(provider)}</option>`).join("")}`
      : `<option value="">Choose a category first</option>`;
    providerSelect.disabled = categoryProviders.length === 0;
  });

  try {
    const accounts = await Api.myAccounts();
    accountSelect.innerHTML = `<option value="">Select an account</option>${accounts.map((account) =>
      `<option value="${escapeBillHTML(account.accountNumber)}">${escapeBillHTML(account.accountType)} · ${escapeBillHTML(account.accountNumber)} · ${escapeBillHTML(formatCurrency(account.balance))}</option>`
    ).join("")}`;
  } catch (error) {
    showAlert("billAlert", error.message, "error");
  }

  billForm.addEventListener("submit", (event) => {
    event.preventDefault();
    hideAlert("billAlert");
    const selectedProvider = providerSelect.value;
    if (!selectedProvider) {
      showAlert("billAlert", "Choose a service provider to continue.", "error");
      return;
    }

    document.getElementById("reviewCategory").textContent = categorySelect.value;
    document.getElementById("reviewProvider").textContent = selectedProvider;
    document.getElementById("reviewBillId").textContent = document.getElementById("billId").value.trim();
    document.getElementById("reviewAccount").textContent = accountSelect.selectedOptions[0]?.textContent || "";
    document.getElementById("reviewAmount").textContent = formatCurrency(Number(document.getElementById("billAmount").value));
    billForm.hidden = true;
    review.hidden = false;
    review.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("editBillBtn").addEventListener("click", () => {
    review.hidden = true;
    billForm.hidden = false;
    billForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("confirmBillBtn").addEventListener("click", async (event) => {
    if (review.hidden) return;
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Processing payment...";
    try {
      const billId = document.getElementById("billId").value.trim();
      const category = categorySelect.value;
      const provider = providerSelect.value;
      const result = await Api.withdraw({
        accountNumber: accountSelect.value,
        amount: Number(document.getElementById("billAmount").value),
        description: `${category} bill · ${provider} · Bill ID ${billId}`,
      });

      document.getElementById("billReceiptText").textContent = `${formatCurrency(result.amount)} was debited from your account. Bank transaction reference: ${result.transactionRef}. Updated balance: ${formatCurrency(result.balanceAfter)}. The biller settlement is not connected in this demo.`;
      document.getElementById("receiptBillId").textContent = billId;
      document.getElementById("receiptReference").textContent = result.transactionRef;
      showTransactionReceiptActions("billReceiptActions", result, {
        billId,
        provider,
        accountNumber: accountSelect.value,
        description: `${category} bill - ${provider} - Bill ID ${billId}`,
        disclaimer: "Biller settlement is not connected in this demo.",
      });
      review.hidden = true;
      receipt.hidden = false;
      receipt.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      showAlert("billAlert", error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = "Confirm payment";
    }
  });

  document.getElementById("anotherBillBtn").addEventListener("click", () => {
    receipt.hidden = true;
    billForm.reset();
    providerSelect.innerHTML = `<option value="">Choose a category first</option>`;
    providerSelect.disabled = true;
    accountSelect.selectedIndex = 0;
    billForm.hidden = false;
    hideAlert("billAlert");
    billForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

function escapeBillHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}