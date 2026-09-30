document.addEventListener("DOMContentLoaded", () => {
  if (Auth.isLoggedIn()) {
    window.location.href = Auth.getUser()?.role === "ADMIN" ? "admin.html" : "dashboard.html";
    return;
  }

  const form = document.getElementById("registerForm");
  const btn = document.getElementById("registerBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert("registerAlert");

    const payload = {
      fullName: document.getElementById("fullName").value.trim(),
      email: document.getElementById("email").value.trim(),
      phoneNumber: document.getElementById("phoneNumber").value.trim(),
      username: document.getElementById("username").value.trim(),
      password: document.getElementById("password").value,
    };

    btn.disabled = true;
    btn.textContent = "Creating account...";

    try {
      const response = await Api.register(payload);
      Auth.setSession(response);
      window.location.href = "dashboard.html";
    } catch (err) {
      showAlert("registerAlert", err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Create Account";
    }
  });
});
