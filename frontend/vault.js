const API_BASE = "http://localhost:3000/api";

const vaultBody = document.getElementById("vault-body");
const emptyState = document.getElementById("empty-state");
const vaultMessageEl = document.getElementById("vault-message");

const addForm = document.getElementById("add-form");
const websiteInput = document.getElementById("website");
const usernameInput = document.getElementById("username");
const vaultPassInput = document.getElementById("vaultPassword");
const toggleVaultPasswordBtn = document.getElementById("toggleVaultPassword");
const logoutBtn = document.getElementById("logout-btn");

// Helper to get token
function getToken() {
  return localStorage.getItem("token");
}

// Redirect to login if not authenticated
(function ensureAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = "login.html";
  }
})();

// Toggle password visibility in add form
toggleVaultPasswordBtn.addEventListener("click", () => {
  const type = vaultPassInput.type === "password" ? "text" : "password";
  vaultPassInput.type = type;
});

// Load passwords from backend
async function loadPasswords() {
  vaultMessageEl.textContent = "";
  const token = getToken();
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/passwords`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      vaultMessageEl.textContent = "Failed to load passwords.";
      return;
    }

    const data = await res.json();
    renderVault(data);
  } catch (err) {
    console.error("Load passwords error:", err);
    vaultMessageEl.textContent = "Network error while loading passwords.";
  }
}

// Render table rows
function renderVault(items) {
  vaultBody.innerHTML = "";

  if (!items || items.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  items.forEach((item) => {
    const tr = document.createElement("tr");

    const createdDate = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString()
      : "";

    tr.innerHTML = `
      <td>${item.website || ""}</td>
      <td>${item.username || ""}</td>
      <td class="password-cell">
        <span class="password-value">••••••••</span>
        <button class="action-btn copy">Copy</button>
        <button class="action-btn toggle">Show</button>
      </td>
      <td>${createdDate}</td>
      <td>
        <button class="action-btn delete">Delete</button>
      </td>
    `;

    // Attach behaviors for this row
    const passwordValueEl = tr.querySelector(".password-value");
    const copyBtn = tr.querySelector(".copy");
    const toggleBtn = tr.querySelector(".toggle");
    const deleteBtn = tr.querySelector(".delete");

    let isShown = false;
    let actualPassword = item.password; // backend currently returns decrypted password

    toggleBtn.addEventListener("click", () => {
      isShown = !isShown;
      if (isShown) {
        passwordValueEl.textContent = actualPassword || "";
        toggleBtn.textContent = "Hide";
      } else {
        passwordValueEl.textContent = "••••••••";
        toggleBtn.textContent = "Show";
      }
    });

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(actualPassword || "");
        vaultMessageEl.textContent = "Password copied to clipboard.";
        vaultMessageEl.classList.add("success");
        setTimeout(() => {
          vaultMessageEl.textContent = "";
          vaultMessageEl.classList.remove("success");
        }, 1500);
      } catch {
        vaultMessageEl.textContent = "Failed to copy password.";
      }
    });

    deleteBtn.addEventListener("click", () => handleDelete(item.id || item._id));

    vaultBody.appendChild(tr);
  });
}

// Add new password
addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  vaultMessageEl.textContent = "";
  vaultMessageEl.classList.remove("success");

  const website = websiteInput.value.trim();
  const username = usernameInput.value.trim();
  const password = vaultPassInput.value;

  if (!website || !username || !password) {
    vaultMessageEl.textContent = "All fields are required.";
    return;
  }

  const token = getToken();
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/passwords/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ website, username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      vaultMessageEl.textContent = data.error || "Failed to save password.";
      return;
    }

    vaultMessageEl.textContent = "Password saved successfully.";
    vaultMessageEl.classList.add("success");
    addForm.reset();
    await loadPasswords();
  } catch (err) {
    console.error("Add password error:", err);
    vaultMessageEl.textContent = "Network error while saving password.";
  }
});

// Delete password
async function handleDelete(id) {
  if (!confirm("Delete this password?")) return;

  const token = getToken();
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/passwords/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      vaultMessageEl.textContent = data.error || "Failed to delete password.";
      return;
    }

    vaultMessageEl.textContent = "Password deleted.";
    vaultMessageEl.classList.add("success");
    await loadPasswords();
  } catch (err) {
    console.error("Delete password error:", err);
    vaultMessageEl.textContent = "Network error while deleting password.";
  }
}

// Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
});

// Initial load
loadPasswords();
