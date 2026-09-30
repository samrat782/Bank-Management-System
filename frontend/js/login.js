document.addEventListener("DOMContentLoaded", () => {
  if (Auth.isLoggedIn()) {
    window.location.href = Auth.getUser()?.role === "ADMIN" ? "admin.html" : "dashboard.html";
    return;
  }

  const form = document.getElementById("loginForm");
  const button = document.getElementById("loginBtn");
  const customerMode = document.getElementById("customerLoginMode");
  const adminMode = document.getElementById("adminLoginMode");
  const usernameLabel = document.querySelector('label[for="username"]');
  const lead = document.querySelector(".auth-card .lead");
  const customerHint = document.querySelector(".demo-hint:not(.admin-demo-hint)");
  const adminHint = document.getElementById("adminDemoHint");
  let loginRole = "CUSTOMER";

  function setLoginRole(role) {
    loginRole = role;
    const isAdmin = role === "ADMIN";
    customerMode.classList.toggle("active", !isAdmin);
    adminMode.classList.toggle("active", isAdmin);
    customerMode.setAttribute("aria-selected", String(!isAdmin));
    adminMode.setAttribute("aria-selected", String(isAdmin));
    usernameLabel.textContent = isAdmin ? "Administrator ID" : "User ID";
    lead.textContent = isAdmin
      ? "Sign in to manage customers, accounts, transactions and lending decisions."
      : "Log in to manage your accounts, transfers and statements.";
    customerHint.hidden = isAdmin;
    adminHint.hidden = !isAdmin;
    hideAlert("loginAlert");
  }

  customerMode.addEventListener("click", () => setLoginRole("CUSTOMER"));
  adminMode.addEventListener("click", () => setLoginRole("ADMIN"));
  if (new URLSearchParams(window.location.search).get("mode") === "admin") {
    setLoginRole("ADMIN");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert("loginAlert");
    button.disabled = true;
    button.textContent = "Logging in...";

    try {
      const response = await Api.login({
        username: document.getElementById("username").value.trim(),
        password: document.getElementById("password").value,
      });
      if (response.role !== loginRole) {
        showAlert("loginAlert", loginRole === "ADMIN"
          ? "This account does not have administrator access."
          : "Use Administrator login for this account.", "error");
        return;
      }
      Auth.setSession(response);
      window.location.href = loginRole === "ADMIN" ? "admin.html" : "dashboard.html";
    } catch (error) {
      showAlert("loginAlert", error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = "Log In";
    }
  });
});
