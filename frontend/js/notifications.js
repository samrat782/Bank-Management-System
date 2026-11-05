document.addEventListener("DOMContentLoaded", () => {
  const user = Auth.getUser();
  if (!user || user.role !== "CUSTOMER") return;

  const storageKey = `apna-bank-notifications:${user.username}`;
  let state = readNotificationState(storageKey);
  let refreshing = false;
  const { wrapper, button, panel } = mountNotificationCenter();

  // The bell leads to the dedicated notifications screen. Keeping the
  // notification state in local storage means the unread badge stays in sync
  // across every banking page and on the new screen.
  button.addEventListener("click", () => {
    window.location.href = "notifications.html";
  });

  panel.addEventListener("click", (event) => {
    if (event.target.closest("[data-mark-all-read]")) {
      state.notifications.forEach((item) => { item.read = true; });
      saveNotificationState(storageKey, state);
      renderNotificationPanel(panel, state);
      updateNotificationButton(button, state);
      return;
    }

    const notificationLink = event.target.closest("[data-notification-id]");
    if (notificationLink) {
      const notification = state.notifications.find((item) => item.id === notificationLink.dataset.notificationId);
      if (notification) notification.read = true;
      saveNotificationState(storageKey, state);
      updateNotificationButton(button, state);
    }
  });

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
      button.focus();
    }
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey) return;
    state = readNotificationState(storageKey);
    updateNotificationButton(button, state);
    if (!panel.hidden) renderNotificationPanel(panel, state);
  });

  updateNotificationButton(button, state);
  refreshNotifications();
  window.setInterval(() => {
    if (!document.hidden) refreshNotifications();
  }, 30000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshNotifications();
  });

  async function refreshNotifications() {
    if (refreshing) return;
    refreshing = true;
    try {
      const [accountsResult, loansResult] = await Promise.allSettled([
        Api.myAccounts(),
        Api.myLoanApplications(),
      ]);
      let changed = false;

      if (accountsResult.status === "fulfilled") {
        const historyResults = await Promise.allSettled(
          accountsResult.value.map((account) => Api.history(account.accountNumber))
        );
        if (historyResults.every((result) => result.status === "fulfilled")) {
          const transactionRefs = new Set(state.transactionRefs);
          const transactions = historyResults
            .flatMap((result) => result.value)
            .filter((transaction) => transaction.transactionRef);

          if (!state.transactionsInitialized) {
            transactions.forEach((transaction) => transactionRefs.add(transaction.transactionRef));
            state.transactionsInitialized = true;
            changed = true;
          } else {
            transactions
              .filter((transaction) => !transactionRefs.has(transaction.transactionRef))
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
              .forEach((transaction) => {
                transactionRefs.add(transaction.transactionRef);
                addNotification(state, {
                  id: `transaction:${transaction.transactionRef}`,
                  type: "transaction",
                  title: transaction.type === "DEPOSIT" ? "Deposit received" : "Transaction completed",
                  message: `${transaction.type.replaceAll("_", " ")} of ${formatCurrency(transaction.amount)}. Ref ${transaction.transactionRef}.`,
                  createdAt: transaction.createdAt,
                  href: "transactions.html",
                });
                changed = true;
              });
          }
          state.transactionRefs = Array.from(transactionRefs);
        }
      }

      if (loansResult.status === "fulfilled") {
        const loanStatuses = { ...state.loanStatuses };
        loansResult.value.forEach((loan) => {
          const id = String(loan.id);
          const previousStatus = loanStatuses[id];
          if (previousStatus && previousStatus !== loan.status) {
            const statusText = String(loan.status).toLowerCase();
            addNotification(state, {
              id: `loan:${id}:${loan.status}`,
              type: "loan",
              title: loan.status === "APPROVED" ? "Loan approved" : "Loan application updated",
              message: `Your ${formatCurrency(loan.amount)} loan application is ${statusText}.${loan.reviewNote ? ` ${loan.reviewNote}` : ""}`,
              createdAt: loan.reviewedAt || new Date().toISOString(),
              href: "loans.html",
            });
            changed = true;
          }
          loanStatuses[id] = loan.status;
        });
        state.loanStatuses = loanStatuses;
        state.loansInitialized = true;
        changed = true;
      }

      if (changed) saveNotificationState(storageKey, state);
      updateNotificationButton(button, state);
      if (!panel.hidden) renderNotificationPanel(panel, state);
    } catch (error) {
      console.warn("Could not refresh notifications.", error);
    } finally {
      refreshing = false;
    }
  }
});

function mountNotificationCenter() {
  const header = document.querySelector(".top-header");
  let button = header?.querySelector('[aria-label="Notifications"]');
  if (!button && header) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "header-icon-btn";
    button.setAttribute("aria-label", "Notifications");
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>';
    const headerRight = header.querySelector(".header-right");
    const user = header.querySelector(".header-user");
    if (headerRight && user) headerRight.insertBefore(button, user);
    else if (user) header.insertBefore(button, user);
    else header.appendChild(button);
  }

  const wrapper = document.createElement("div");
  wrapper.className = "notification-center";
  const panel = document.createElement("section");
  panel.className = "notification-panel";
  panel.setAttribute("aria-label", "Notifications");
  panel.hidden = true;

  if (button) {
    button.type = "button";
    button.classList.add("notification-trigger");
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");
    button.replaceWith(wrapper);
    wrapper.append(button, panel);
  }

  return { wrapper, button, panel };
}

function readNotificationState(storageKey) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
    return {
      transactionsInitialized: Boolean(stored?.transactionsInitialized),
      loansInitialized: Boolean(stored?.loansInitialized),
      transactionRefs: Array.isArray(stored?.transactionRefs) ? stored.transactionRefs : [],
      loanStatuses: stored?.loanStatuses && typeof stored.loanStatuses === "object" ? stored.loanStatuses : {},
      notifications: Array.isArray(stored?.notifications) ? stored.notifications : [],
    };
  } catch {
    return { transactionsInitialized: false, loansInitialized: false, transactionRefs: [], loanStatuses: {}, notifications: [] };
  }
}

function saveNotificationState(storageKey, state) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.warn("Could not save notifications.", error);
  }
}

function addNotification(state, notification) {
  if (state.notifications.some((item) => item.id === notification.id)) return;
  state.notifications.unshift({ ...notification, read: false });
  state.notifications = state.notifications.slice(0, 50);
}

function updateNotificationButton(button, state) {
  if (!button) return;
  const unread = state.notifications.filter((item) => !item.read).length;
  button.setAttribute("aria-label", unread ? `Notifications, ${unread} unread` : "Notifications");
  button.title = unread ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "Notifications";
  let badge = button.querySelector(".notification-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "notification-badge";
    badge.setAttribute("aria-hidden", "true");
    button.appendChild(badge);
  }
  badge.textContent = unread > 9 ? "9+" : String(unread);
  badge.hidden = unread === 0;
}

function renderNotificationPanel(panel, state) {
  const unread = state.notifications.filter((item) => !item.read).length;
  const items = state.notifications.slice(0, 20);
  panel.innerHTML = `
    <div class="notification-panel-header"><div><strong>Notifications</strong><small>${unread ? `${unread} unread` : "You're all caught up"}</small></div>
      ${unread ? '<button type="button" class="notification-mark-read" data-mark-all-read>Mark all read</button>' : ""}</div>
    ${items.length ? `<div class="notification-list">${items.map((item) => {
      const itemType = item.type === "loan" ? "loan" : "transaction";
      const href = itemType === "loan" ? "loans.html" : "transactions.html";
      return `
        <a class="notification-item ${item.read ? "" : "unread"}" href="${href}" data-notification-id="${escapeNotificationHTML(item.id)}">
          <span class="notification-item-icon ${itemType}" aria-hidden="true">${itemType === "loan" ? "L" : "₹"}</span>
          <span class="notification-item-copy"><strong>${escapeNotificationHTML(item.title)}</strong><span>${escapeNotificationHTML(item.message)}</span><small>${escapeNotificationHTML(notificationTime(item.createdAt))}</small></span>
          ${item.read ? "" : '<span class="notification-unread-dot" aria-label="Unread"></span>'}
        </a>
      `;
    }).join("")}</div>` : '<div class="notification-empty">Transaction and loan updates will appear here.</div>'}
  `;
}

function notificationTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function escapeNotificationHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}
