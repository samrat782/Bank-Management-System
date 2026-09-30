document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireLogin();
  const user = Auth.getUser();
  if (user?.role !== "CUSTOMER") {
    window.location.href = user?.role === "ADMIN" ? "admin.html" : "index.html";
    return;
  }

  document.getElementById("cardName").textContent = user.fullName || user.username;
  document.getElementById("cardAvatar").textContent = initials(user.fullName || user.username);
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

  try {
    const accounts = await Api.myAccounts();
    const activeAccounts = accounts.filter((account) => account.status === "ACTIVE");
    document.getElementById("debitCardCount").textContent = `${activeAccounts.length} active`;
    document.getElementById("debitCards").innerHTML = activeAccounts.length
      ? activeAccounts.map(renderDebitCard).join("")
      : `<div class="empty-state">No active accounts are available for debit access.</div>`;
  } catch (error) {
    document.getElementById("debitCardCount").textContent = "Unavailable";
    document.getElementById("debitCards").innerHTML = `<div class="empty-state">Could not load account access. ${escapeCardHTML(error.message)}</div>`;
  }
});

function renderDebitCard(account) {
  const type = account.accountType.charAt(0) + account.accountType.slice(1).toLowerCase();
  const suffix = account.accountNumber.slice(-4);
  return `
    <article class="debit-card-item">
      <div class="bank-card-preview debit-card-preview" aria-label="${escapeCardHTML(type)} debit card preview">
        <div class="bank-card-top"><span class="bank-card-brand">APNA<span> BANK</span></span><span class="bank-card-type">DEBIT</span></div>
        <div class="bank-card-chip" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        <div class="bank-card-number">ACCOUNT •••• ${escapeCardHTML(suffix)}</div>
        <div class="bank-card-bottom"><span>${escapeCardHTML(type.toUpperCase())} ACCOUNT</span><span class="card-network">VISA</span></div>
      </div>
      <div class="debit-card-meta"><div><strong>${escapeCardHTML(type)} account</strong><span>Linked account ending ${escapeCardHTML(suffix)}</span></div><span class="admin-status status-active">${escapeCardHTML(account.status)}</span></div>
    </article>
  `;
}

function escapeCardHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}
