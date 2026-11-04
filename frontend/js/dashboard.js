document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireLogin();

  const user = Auth.getUser();
  const adminLink = document.getElementById("adminNavLink");
  if (adminLink && user?.role === "ADMIN") adminLink.hidden = false;
  const userRole = document.getElementById("userRole");
  if (userRole && user?.role === "ADMIN") userRole.textContent = "Bank Administrator";

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (user?.fullName || "").split(" ")[0] || "Customer";
  document.getElementById("welcomeName").textContent = greeting + ", " + firstName;

  // Header avatar & user name
  const avatarEl = document.getElementById("headerAvatar");
  if (avatarEl && user?.fullName) {
    avatarEl.textContent = initials(user.fullName);
  }

  const greetEl = document.getElementById("userGreeting");
  if (greetEl) {
    greetEl.textContent = user?.fullName || "User";
  }

  // Current date
  const dateEl = document.getElementById("currentDate");
  if (dateEl) {
    const now = new Date();
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    dateEl.textContent = days[now.getDay()] + ", " + now.getDate() + " " + months[now.getMonth()] + " " + now.getFullYear();
  }

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    Auth.clearSession();
    window.location.href = "index.html";
  });

  // Mobile sidebar
  const menuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("show");
    });
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("show");
    });
  }

  await loadAccountsAndTransactions();
});

async function loadAccountsAndTransactions() {
  const txnContainer = document.getElementById("recentTxnContainer");

  try {
    const accounts = await Api.myAccounts();

    if (accounts.length === 0) {
      txnContainer.innerHTML = `<div class="empty-state">No accounts found. Open a deposit to get started.</div>`;
      return;
    }

    // ---- Populate Balance Card ----
    const total = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
    const balanceEl = document.getElementById("totalBalance");
    if (balanceEl) balanceEl.textContent = formatCurrency(total);

    const primaryEl = document.getElementById("primaryAccount");
    if (primaryEl) {
      const acc = accounts[0];
      const type = acc.accountType.charAt(0) + acc.accountType.slice(1).toLowerCase();
      primaryEl.textContent = type + " Account · XXXX XXXX " + acc.accountNumber.slice(-4);
    }

    // Also populate hidden grid for backward compat
    const grid = document.getElementById("accountGrid");
    if (grid) grid.innerHTML = accounts.map(renderAccountCard).join("");

    // ---- Pull & merge transactions ----
    const historyLists = await Promise.all(
      accounts.map((acc) => Api.history(acc.accountNumber).catch(() => []))
    );

    // ---- Populate Account List Panel ----
    const panel = document.getElementById("accountListPanel");
    if (panel) {
      panel.innerHTML = accounts.map((acc, index) => {
        const type = acc.accountType.charAt(0) + acc.accountType.slice(1).toLowerCase();
        const latest = (historyLists[index] || []).slice().sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )[0];
        return renderAccountListItem(acc, type, latest);
      }).join("");
    }

    const allTxns = historyLists.flat();

    const seen = new Set();
    const merged = allTxns.filter((t) => {
      if (seen.has(t.transactionRef)) return false;
      seen.add(t.transactionRef);
      return true;
    });
    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // ---- Update balance card stats ----
    const now = new Date();
    const thisMonth = merged.filter((t) => {
      const d = new Date(t.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const monthIn = thisMonth
      .filter((t) => t.type === "DEPOSIT")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const monthOut = thisMonth
      .filter((t) => t.type === "WITHDRAW" || t.type === "TRANSFER")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const inEl = document.getElementById("monthIn");
    const outEl = document.getElementById("monthOut");
    if (inEl) inEl.textContent = "+ " + formatCurrency(monthIn);
    if (outEl) outEl.textContent = "− " + formatCurrency(monthOut);

    // ---- Render transaction list (new card style) ----
    renderTransactionList(txnContainer, merged);
  } catch (err) {
    showAlert("dashboardAlert", err.message, "error");
    txnContainer.innerHTML = `<div class="empty-state">Could not load transactions.</div>`;
  }
}

function renderAccountListItem(account, type, latest) {
  const latestToday = latest && isToday(new Date(latest.createdAt)) ? latest : null;
  let recentMarkup = `<span class="account-item-recent-empty">No transaction found today</span>`;

  if (latestToday) {
    const isDebit = latestToday.type === "WITHDRAW" ||
      (latestToday.type === "TRANSFER" && latestToday.fromAccountNumber === account.accountNumber);
    const description = latestToday.description || latestToday.type.charAt(0) + latestToday.type.slice(1).toLowerCase();
    recentMarkup = `
      <span class="account-item-recent-description" title="${escapeDashboardHTML(description)}">${escapeDashboardHTML(description)} · Today</span>
      <span class="account-item-recent-amount ${isDebit ? "debit" : "credit"}">${isDebit ? "− " : "+ "}${formatCurrency(latestToday.amount)}</span>
    `;
  }

  return `
    <div class="account-item">
      <div class="account-item-main">
        <div class="account-item-name">${escapeDashboardHTML(type)} Account</div>
        <div class="account-item-number">XXXX XXXX ${escapeDashboardHTML(account.accountNumber.slice(-4))}</div>
        <div class="account-item-recent">
          <span class="account-item-recent-label">Recent</span>
          ${recentMarkup}
        </div>
      </div>
      <div class="account-item-balance">${formatCurrency(account.balance)}</div>
    </div>
  `;
}

function escapeDashboardHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function renderAccountCard(account) {
  return `
    <div class="account-card">
      <span class="type-badge">${account.accountType} ACCOUNT</span>
      <div class="acc-number">${formatAccountNumber(account.accountNumber)}</div>
      <div class="balance-label">Available Balance</div>
      <div class="balance">${formatCurrency(account.balance)}</div>
      <div class="meta">
        <span>${account.branch}</span>
        <span>IFSC: ${account.ifscCode}</span>
      </div>
    </div>
  `;
}

function formatAccountNumber(accNum) {
  return accNum.replace(/(.{4})/g, "$1 ").trim();
}

function renderTransactionList(container, txns) {
  if (!txns || txns.length === 0) {
    container.innerHTML = `<div class="empty-state">No transactions yet. Deposit or transfer funds to get started.</div>`;
    return;
  }

  const items = txns.map((t) => {
    const isDebit = t.type === "WITHDRAW" || (t.type === "TRANSFER" && t.fromAccountNumber);
    const isCredit = t.type === "DEPOSIT";
    const iconClass = isCredit ? "credit" : isDebit ? "debit" : "transfer-icon";
    const amountClass = isCredit ? "credit" : "debit";
    const sign = isCredit ? "+ " : "− ";

    const arrowSvg = isCredit
      ? '<svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>'
      : '<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';

    const desc = t.description || t.type.charAt(0) + t.type.slice(1).toLowerCase();
    const dt = new Date(t.createdAt);
    const timeStr = dt.toLocaleString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true
    });
    const dateStr = isToday(dt) ? "Today" : formatDateTime(t.createdAt).split(",")[0];
    const metaText = dateStr + ", " + timeStr + " · " + t.type;

    return `
      <div class="txn-item">
        <div class="txn-icon ${iconClass}">${arrowSvg}</div>
        <div class="txn-details">
          <div class="txn-name">${desc}</div>
          <div class="txn-meta">${metaText}</div>
        </div>
        <div class="txn-amount-col">
          <div class="txn-amount ${amountClass}">${sign}${formatCurrency(t.amount)}</div>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `<div class="txn-list">${items}</div>`;
}

function renderTransactionTable(container, txns) {
  // Keep old function for backward compat (transactions.html)
  if (!txns || txns.length === 0) {
    container.innerHTML = `<div class="empty-state">No transactions yet.</div>`;
    return;
  }

  const rows = txns
    .map((t) => {
      const pillClass = t.type === "DEPOSIT" ? "pill-deposit" : t.type === "WITHDRAW" ? "pill-withdraw" : "pill-transfer";
      const amountClass = t.type === "WITHDRAW" ? "amount-debit" : t.type === "DEPOSIT" ? "amount-credit" : "amount-debit";
      const sign = t.type === "DEPOSIT" ? "+" : "-";

      return `
        <tr>
          <td>${formatDateTime(t.createdAt)}</td>
          <td><span class="pill ${pillClass}">${t.type}</span></td>
          <td>${t.description || "-"}</td>
          <td>${t.fromAccountNumber || "-"} ${t.type === "TRANSFER" ? "&rarr; " + t.toAccountNumber : ""}</td>
          <td class="${amountClass}">${sign} ${formatCurrency(t.amount)}</td>
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
          <th>Description</th>
          <th>Account</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}
