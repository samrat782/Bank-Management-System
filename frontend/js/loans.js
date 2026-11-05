document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireLogin();
  const user = Auth.getUser();
  if (user?.role !== "CUSTOMER") {
    window.location.href = user?.role === "ADMIN" ? "admin.html" : "index.html";
    return;
  }

  document.getElementById("loanName").textContent = user.fullName || user.username;
  document.getElementById("loanAvatar").textContent = initials(user.fullName || user.username);
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

  const amountInput = document.getElementById("loanAmount");
  const termInput = document.getElementById("loanTerm");
  const updateEstimate = () => renderLoanEstimate(amountInput.value, Number(termInput.value));
  amountInput.addEventListener("input", updateEstimate);
  termInput.addEventListener("change", updateEstimate);
  updateEstimate();

  document.getElementById("loanForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector("button[type=submit]");
    submitButton.disabled = true;
    try {
      const application = await Api.applyForLoan({
        amount: Number(amountInput.value),
        purpose: document.getElementById("loanPurpose").value.trim(),
        termMonths: Number(termInput.value),
      });
      form.reset();
      updateEstimate();
      showAlert("loanAlert", `Application submitted for review. Indicative rate: ${application.interestRate}% for ${application.termMonths} months; estimated monthly payment: ${formatCurrency(application.monthlyPayment)}. Final terms are subject to approval.`, "success");
      await loadMyLoanApplications();
    } catch (error) {
      showAlert("loanAlert", error.message, "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  await loadMyLoanApplications();
});

function renderLoanEstimate(amountValue, termMonths) {
  const estimate = document.getElementById("loanEstimate");
  const rates = { 12: 10.5, 24: 11, 36: 11.5, 60: 12 };
  const amount = Number(amountValue);
  const annualRate = rates[termMonths];
  if (!amount || amount <= 0 || !annualRate) {
    estimate.textContent = "Enter an amount to see your indicative rate and estimated monthly payment.";
    return;
  }
  const monthlyRate = annualRate / 1200;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const monthlyPayment = amount * monthlyRate * factor / (factor - 1);
  estimate.textContent = `Indicative rate ${annualRate.toFixed(2)}% p.a. | ${termMonths} months | estimated monthly payment ${formatCurrency(monthlyPayment)}. Final terms are subject to approval.`;
}

async function loadMyLoanApplications() {
  const container = document.getElementById("myLoanTable");
  container.innerHTML = `<div class="empty-state">Loading applications...</div>`;
  try {
    const applications = await Api.myLoanApplications();
    container.innerHTML = applications.length ? `
      <table class="txn-table"><thead><tr><th>Applied</th><th>Amount</th><th>Purpose</th><th>Rate</th><th>Term</th><th>Est. monthly</th><th>Status</th><th>Reviewed</th><th>Review note</th></tr></thead>
      <tbody>${applications.map((application) => `
        <tr><td>${escapeLoanHTML(formatDateTime(application.appliedAt))}</td><td>${escapeLoanHTML(formatCurrency(application.amount))}</td>
        <td>${escapeLoanHTML(application.purpose)}</td><td>${escapeLoanHTML(application.interestRate == null ? "-" : `${application.interestRate}%`)}</td>
        <td>${escapeLoanHTML(application.termMonths == null ? "-" : `${application.termMonths} months`)}</td><td>${escapeLoanHTML(application.monthlyPayment == null ? "-" : formatCurrency(application.monthlyPayment))}</td>
        <td><span class="admin-status status-${escapeLoanHTML(application.status.toLowerCase())}">${escapeLoanHTML(application.status)}</span></td>
        <td>${escapeLoanHTML(application.reviewedAt ? formatDateTime(application.reviewedAt) : "Pending")}</td><td>${escapeLoanHTML(application.reviewNote || "-")}</td></tr>
      `).join("")}</tbody></table>
    ` : `<div class="empty-state">You have no loan applications yet.</div>`;
  } catch (error) {
    container.innerHTML = `<div class="empty-state">Could not load your applications.</div>`;
    showAlert("loanAlert", error.message, "error");
  }
}

function escapeLoanHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}