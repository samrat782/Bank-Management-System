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

  document.getElementById("loanForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector("button[type=submit]");
    submitButton.disabled = true;
    try {
      await Api.applyForLoan({
        amount: Number(document.getElementById("loanAmount").value),
        purpose: document.getElementById("loanPurpose").value.trim(),
      });
      event.currentTarget.reset();
      showAlert("loanAlert", "Loan application submitted for review.", "success");
      await loadMyLoanApplications();
    } catch (error) {
      showAlert("loanAlert", error.message, "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  await loadMyLoanApplications();
});

async function loadMyLoanApplications() {
  const container = document.getElementById("myLoanTable");
  container.innerHTML = `<div class="empty-state">Loading applications...</div>`;
  try {
    const applications = await Api.myLoanApplications();
    container.innerHTML = applications.length ? `
      <table class="txn-table"><thead><tr><th>Applied</th><th>Amount</th><th>Purpose</th><th>Status</th><th>Reviewed</th><th>Review note</th></tr></thead>
      <tbody>${applications.map((application) => `
        <tr><td>${escapeLoanHTML(formatDateTime(application.appliedAt))}</td><td>${escapeLoanHTML(formatCurrency(application.amount))}</td>
        <td>${escapeLoanHTML(application.purpose)}</td><td><span class="admin-status status-${escapeLoanHTML(application.status.toLowerCase())}">${escapeLoanHTML(application.status)}</span></td>
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