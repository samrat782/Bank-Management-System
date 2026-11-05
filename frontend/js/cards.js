document.addEventListener("DOMContentLoaded", async () => {
  Auth.requireLogin();
  const user = Auth.getUser();
  if (user?.role !== "CUSTOMER") {
    window.location.href = user?.role === "ADMIN" ? "admin.html" : "index.html";
    return;
  }

  document.getElementById("cardName").textContent = user.fullName || user.username;
  document.getElementById("cardAvatar").textContent = initials(user.fullName || user.username);
  document.getElementById("logoutBtn").addEventListener("click", () => { Auth.clearSession(); window.location.href = "index.html"; });
  const menuButton = document.getElementById("mobileMenuBtn"), sidebar = document.getElementById("sidebar"), overlay = document.getElementById("sidebarOverlay");
  menuButton.addEventListener("click", () => { sidebar.classList.toggle("open"); overlay.classList.toggle("show"); });
  overlay.addEventListener("click", () => { sidebar.classList.remove("open"); overlay.classList.remove("show"); });

  const storageKey = `apna-bank-cards:${user.username}`;
  const grid = document.getElementById("debitCards");
  const issueForm = document.getElementById("issueCardForm");
  const issueType = document.getElementById("newCardType");
  const issueAccountField = document.getElementById("issueAccountField");
  const issueAccount = document.getElementById("newCardAccount");
  let accounts = [];

  const readCards = () => { try { const saved = JSON.parse(localStorage.getItem(storageKey) || "[]"); return Array.isArray(saved) ? saved : []; } catch { return []; } };
  const saveCards = (cards) => localStorage.setItem(storageKey, JSON.stringify(cards));
  const accountName = (number) => `Account ending ${String(number).slice(-4)}`;
  const cardNumber = (card) => `•••• •••• •••• ${String(card.number).slice(-4)}`;

  function render() {
    const cards = readCards();
    const issuedAccounts = new Set(cards.filter(card => card.type === "DEBIT").map(card => card.accountNumber));
    issueAccount.innerHTML = accounts.filter(account => !issuedAccounts.has(account.accountNumber)).map(account => `<option value="${escapeCardHTML(account.accountNumber)}">${escapeCardHTML(accountName(account.accountNumber))} · ${escapeCardHTML(account.accountType)}</option>`).join("");
    if (!cards.length) { grid.innerHTML = '<div class="empty-state">No cards issued yet. Select <strong>Issue card</strong> to get started.</div>'; return; }
    grid.innerHTML = cards.map(renderCard).join("");
  }

  function renderCard(card) {
    const isBlocked = card.status === "BLOCKED";
    const linked = card.type === "DEBIT" ? accountName(card.accountNumber) : "Apna Rewards credit card";
    return `<article class="debit-card-item managed-card ${isBlocked ? "card-is-blocked" : ""}">
      <div class="bank-card-preview ${card.type === "CREDIT" ? "credit-card-preview" : "debit-card-preview"}">
        <div class="bank-card-top"><span class="bank-card-brand">APNA<span> BANK</span></span><span class="bank-card-type">${card.type}</span></div>
        <div class="bank-card-chip" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        <div class="bank-card-number">${cardNumber(card)}</div>
        <div class="bank-card-bottom"><span>${escapeCardHTML(linked.toUpperCase())}</span><span class="card-network">VISA</span></div>
        ${isBlocked ? '<span class="card-blocked-label">BLOCKED</span>' : ""}
      </div>
      <div class="debit-card-meta"><div><strong>${escapeCardHTML(card.type[0] + card.type.slice(1).toLowerCase())} card</strong><span>${escapeCardHTML(linked)}</span></div><span class="admin-status ${isBlocked ? "status-rejected" : "status-active"}">${escapeCardHTML(card.status)}</span></div>
      <div class="card-actions"><button class="btn btn-outline" data-action="toggle" data-id="${card.id}" type="button">${isBlocked ? "Unblock card" : "Block card"}</button></div>
      <div class="card-settings">
        <form data-action="limit" data-id="${card.id}"><label>Daily transaction limit <span>₹</span><input type="number" name="limit" min="1000" max="500000" step="500" value="${Number(card.dailyLimit)}" required /></label><button class="btn btn-outline" type="submit">Save limit</button></form>
        <form data-action="pin" data-id="${card.id}"><label>Current PIN<input type="password" name="currentPin" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required /></label><label>New 4-digit PIN<input type="password" name="newPin" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required /></label><button class="btn btn-outline" type="submit">Change PIN</button></form>
      </div>
    </article>`;
  }

  function toggleIssueAccount() { issueAccountField.hidden = issueType.value === "CREDIT"; issueAccount.required = issueType.value === "DEBIT"; }
  document.getElementById("showIssueCard").addEventListener("click", () => { issueForm.hidden = false; document.getElementById("showIssueCard").hidden = true; toggleIssueAccount(); });
  document.getElementById("cancelIssueCard").addEventListener("click", () => { issueForm.reset(); issueForm.hidden = true; document.getElementById("showIssueCard").hidden = false; });
  issueType.addEventListener("change", toggleIssueAccount);
  issueForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (issueType.value === "DEBIT" && !issueAccount.value) { showAlert("cardsAlert", "Choose an active account for this debit card."); return; }
    const cards = readCards();
    cards.push({ id: crypto.randomUUID(), type: issueType.value, accountNumber: issueType.value === "DEBIT" ? issueAccount.value : null, number: String(Math.floor(1000 + Math.random() * 9000)), status: "ACTIVE", dailyLimit: issueType.value === "CREDIT" ? 100000 : 25000, pinHash: pinHash("1234"), issuedAt: new Date().toISOString() });
    saveCards(cards); issueForm.reset(); issueForm.hidden = true; document.getElementById("showIssueCard").hidden = false; render(); showAlert("cardsAlert", `${issueType.value[0] + issueType.value.slice(1).toLowerCase()} card issued successfully. Your temporary PIN is 1234; change it below.`, "success");
  });
  grid.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="toggle"]');
    if (!button) return;
    const cards = readCards(), card = cards.find(item => item.id === button.dataset.id);
    if (!card) return;
    card.status = card.status === "BLOCKED" ? "ACTIVE" : "BLOCKED"; saveCards(cards); render(); showAlert("cardsAlert", card.status === "BLOCKED" ? "Your card has been blocked." : "Your card has been unblocked.", "success");
  });
  grid.addEventListener("submit", (event) => {
    const form = event.target, action = form.dataset.action;
    if (!action) return;
    event.preventDefault();
    const cards = readCards(), card = cards.find(item => item.id === form.dataset.id);
    if (!card) return;
    const data = new FormData(form);
    if (action === "limit") { card.dailyLimit = Number(data.get("limit")); saveCards(cards); showAlert("cardsAlert", "Daily transaction limit updated.", "success"); }
    if (action === "pin") {
      const current = String(data.get("currentPin")), next = String(data.get("newPin"));
      if (!/^\d{4}$/.test(current) || !/^\d{4}$/.test(next)) { showAlert("cardsAlert", "PINs must contain exactly four digits."); return; }
      if (pinHash(current) !== card.pinHash) { showAlert("cardsAlert", "The current PIN is incorrect."); return; }
      if (current === next) { showAlert("cardsAlert", "Choose a PIN different from your current PIN."); return; }
      card.pinHash = pinHash(next); card.pinChangedAt = new Date().toISOString(); saveCards(cards); form.reset(); showAlert("cardsAlert", "Your card PIN has been changed.", "success");
    }
  });
  try { accounts = (await Api.myAccounts()).filter(account => account.status === "ACTIVE"); render(); } catch (error) { grid.innerHTML = `<div class="empty-state">Could not load eligible accounts. ${escapeCardHTML(error.message)}</div>`; }
});

function escapeCardHTML(value) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]); }

// Demo-only client-side derivation. A real implementation must validate and hash PINs on the server.
function pinHash(pin) {
  let value = 2166136261;
  for (let index = 0; index < pin.length; index += 1) value = Math.imul(value ^ pin.charCodeAt(index), 16777619);
  return (value >>> 0).toString(16);
}
