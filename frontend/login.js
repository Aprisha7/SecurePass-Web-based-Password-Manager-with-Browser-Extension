const API_BASE = "http://localhost:3000/api";

const loginForm = document.getElementById("login-form");
const loginEmailInput = document.getElementById("email");
const loginPassInput = document.getElementById("masterPassword");
const loginToggleBtn = document.getElementById("togglePassword");
const loginMessageEl = document.getElementById("message");

// Toggle password visibility
loginToggleBtn.addEventListener("click", () => {
  const type = loginPassInput.type === "password" ? "text" : "password";
  loginPassInput.type = type;
});

// Login using backend API
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMessageEl.textContent = "";
  loginMessageEl.classList.remove("success");

  const email = loginEmailInput.value.trim();
  const masterPassword = loginPassInput.value;

  if (!email || !masterPassword) {
    loginMessageEl.textContent = "Email and master password are required.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, masterPassword }),
    });

    const data = await res.json();

    if (!res.ok) {
      loginMessageEl.textContent = data.error || "Login failed.";
      return;
    }

    // Save token + user for later API calls (dashboard, vault, etc.)
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    loginMessageEl.textContent = "Login successful.";
    loginMessageEl.classList.add("success");

    // Redirect to password vault
    window.location.replace("vault.html"); // or window.location.href = "vault.html";
    // TODO: redirect to dashboard once you build it
    // window.location.href = "dashboard.html";
  } catch {
    loginMessageEl.textContent = "Network error. Please try again.";
  }
});
