const API_BASE = "http://localhost:3000/api";

// Common elements
const vaultMessageEl = document.getElementById("vault-message");
const logoutBtn = document.getElementById("logout-btn");

// Navigation elements
const navLinks = document.querySelectorAll(".nav-link");
const pageSections = document.querySelectorAll(".page-section");

// Search elements
const searchInput = document.getElementById("password-search");
const clearSearchBtn = document.getElementById("clear-search");
let allPasswords = []; // Store full list

// Vault elements
const vaultBody = document.getElementById("vault-body");
const emptyState = document.getElementById("empty-state");
const addForm = document.getElementById("add-form");
const websiteInput = document.getElementById("website");
const usernameInput = document.getElementById("username");
const vaultPassInput = document.getElementById("vaultPassword");
const toggleVaultPasswordBtn = document.getElementById("toggleVaultPassword");

// Add these AFTER your existing elements:
const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");
const editIdInput = document.getElementById("edit-id");
const editWebsiteInput = document.getElementById("edit-website");
const editUsernameInput = document.getElementById("edit-username");
const editPasswordInput = document.getElementById("edit-password");
const toggleEditPasswordBtn = document.getElementById("toggle-edit-password");
const closeModalBtn = document.getElementById("close-modal");
const cancelEditBtn = document.getElementById("cancel-edit");

// Generator elements
const genLength = document.getElementById("gen-length");
const genLengthValue = document.getElementById("gen-length-value");
const genNumbers = document.getElementById("gen-numbers");
const genSymbols = document.getElementById("gen-symbols");
const generateBtn = document.getElementById("generate-btn");
const genPasswordInput = document.getElementById("gen-password");
const copyGenBtn = document.getElementById("copy-gen-btn");

// Analyzer elements
const strengthPassword = document.getElementById("strength-password");
const toggleStrength = document.getElementById("toggle-strength");
const meterFill = document.getElementById("meter-fill");
const strengthLabel = document.getElementById("strength-label");
const rules = document.querySelectorAll(".rule");

// Helper to get token
function getToken() {
  return localStorage.getItem("token");
}

// Client-side password generator
function generateSecurePassword(length, includeNumbers, includeSymbols) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let charset = lowercase + uppercase;
  if (includeNumbers) charset += numbers;
  if (includeSymbols) charset += symbols;

  let password = '';
  
  // Ensure at least one character from each required type
  if (includeNumbers) password += numbers[Math.floor(Math.random() * numbers.length)];
  if (includeSymbols) password += symbols[Math.floor(Math.random() * symbols.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];

  // Fill remaining length
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle password for better randomness
  password = password.split('').sort(() => Math.random() - 0.5).join('');
  return password.substring(0, length);
}

// Auth check
(function ensureAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = "login.html";
  }
})();

// Navigation
function switchPage(pageId) {
  pageSections.forEach(section => section.classList.remove("active"));
  navLinks.forEach(link => link.classList.remove("active"));
  
  document.getElementById(`${pageId}-section`).classList.add("active");
  document.querySelector(`[data-page="${pageId}"]`).parentElement.classList.add("active");
  
  if (pageId === "vault") loadPasswords();
}

navLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    switchPage(link.dataset.page);
  });
});

// ========== SEARCH FUNCTIONALITY ==========
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function handleSearch() {
  const query = searchInput.value.toLowerCase().trim();
  
  if (!query) {
    renderVault(allPasswords, false);
    clearSearchBtn.style.display = "none";
    return;
  }
  
  clearSearchBtn.style.display = "block";
  
  const filtered = allPasswords.filter(item => 
    item.website?.toLowerCase().includes(query) ||
    item.username?.toLowerCase().includes(query)
  );
  
  renderVault(filtered, true);
}

function clearSearch() {
  searchInput.value = "";
  clearSearchBtn.style.display = "none";
  renderVault(allPasswords, false);
}

// Search event listeners
if (searchInput) searchInput.addEventListener("input", debounce(handleSearch, 300));
if (clearSearchBtn) clearSearchBtn.addEventListener("click", clearSearch);

// FIXED: Single loadPasswords function
async function loadPasswords() {
  vaultMessageEl.textContent = "";
  const token = getToken();
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/passwords`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      vaultMessageEl.textContent = "Failed to load passwords.";
      return;
    }

    const data = await res.json();
    allPasswords = data; // Store full list for search
    renderVault(data, false);
  } catch (err) {
    console.error("Load passwords error:", err);
    vaultMessageEl.textContent = "Network error while loading passwords.";
  }
}

// FIXED: renderVault with isSearch parameter
function renderVault(items, isSearch = false) {
  vaultBody.innerHTML = "";

  if (!items || items.length === 0) {
    if (isSearch && searchInput && searchInput.value) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td colspan="5" style="text-align: center; padding: 40px; color: #6b7280; font-style: italic;">
          No passwords match "${searchInput.value}"
        </td>
      `;
      vaultBody.appendChild(tr);
    } else {
      emptyState.style.display = "block";
    }
    return;
  }

  emptyState.style.display = "none";

  items.forEach((item) => {
    const tr = document.createElement("tr");
    const createdDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "";
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
        <button class="action-btn edit" title="Edit">Edit</button>
        <button class="action-btn delete" title="Delete">Delete</button>
      </td>
    `;

    const passwordValueEl = tr.querySelector(".password-value");
    const copyBtn = tr.querySelector(".copy");
    const toggleBtn = tr.querySelector(".toggle");
    const editBtn = tr.querySelector(".edit");
    const deleteBtn = tr.querySelector(".delete");

    let isShown = false;
    let actualPassword = item.password;

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

    editBtn.addEventListener("click", () => {
    populateEditForm(item);
    editModal.style.display = "flex";
    });
    deleteBtn.addEventListener("click", () => handleDelete(item.id || item._id));
    vaultBody.appendChild(tr);
  });
}

// ========== VAULT FORM ==========
toggleVaultPasswordBtn.addEventListener("click", () => {
  const type = vaultPassInput.type === "password" ? "text" : "password";
  vaultPassInput.type = type;
});

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
    await loadPasswords(); // Refreshes full list + search
  } catch (err) {
    vaultMessageEl.textContent = "Network error while saving password.";
  }
});

// Edit functions
function populateEditForm(item) {
  editIdInput.value = item.id || item._id;
  editWebsiteInput.value = item.website || "";
  editUsernameInput.value = item.username || "";
  editPasswordInput.value = item.password || "";
}

function closeEditModal() {
  editModal.style.display = "none";
  editForm.reset();
}

// Edit form submission
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const id = editIdInput.value;
  const website = editWebsiteInput.value.trim();
  const username = editUsernameInput.value.trim();
  const password = editPasswordInput.value;

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
    const res = await fetch(`${API_BASE}/passwords/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ website, username, password }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      vaultMessageEl.textContent = data.error || "Failed to update password.";
      return;
    }

    vaultMessageEl.textContent = "Password updated successfully.";
    vaultMessageEl.classList.add("success");
    closeEditModal();
    await loadPasswords();
  } catch (err) {
    console.error("Update error:", err);
    vaultMessageEl.textContent = "Network error while updating password.";
  }
});

// Edit modal controls
toggleEditPasswordBtn?.addEventListener("click", () => {
  const type = editPasswordInput.type === "password" ? "text" : "password";
  editPasswordInput.type = type;
});

closeModalBtn?.addEventListener("click", closeEditModal);
cancelEditBtn?.addEventListener("click", closeEditModal);

// Close on outside click
editModal?.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});


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
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) {
      vaultMessageEl.textContent = data.error || "Failed to delete password.";
      return;
    }

    vaultMessageEl.textContent = "Password deleted.";
    vaultMessageEl.classList.add("success");
    await loadPasswords(); // Refreshes full list + search
  } catch (err) {
    vaultMessageEl.textContent = "Network error while deleting password.";
  }
}

// ========== GENERATOR ==========
genLength.addEventListener("input", () => {
  genLengthValue.textContent = genLength.value;
});

generateBtn.addEventListener("click", () => {
  const length = parseInt(genLength.value);
  const includeNumbers = genNumbers.checked;
  const includeSymbols = genSymbols.checked;

  const password = generateSecurePassword(length, includeNumbers, includeSymbols);
  
  genPasswordInput.value = password;
  genPasswordInput.classList.add("generated");
  copyGenBtn.disabled = false;
  copyGenBtn.textContent = "Copy";
  
  vaultMessageEl.textContent = "Password generated successfully!";
  vaultMessageEl.classList.add("success");
  setTimeout(() => {
    vaultMessageEl.textContent = "";
    vaultMessageEl.classList.remove("success");
  }, 2000);
});

copyGenBtn.addEventListener("click", async () => {
  if (genPasswordInput.value) {
    try {
      await navigator.clipboard.writeText(genPasswordInput.value);
      vaultMessageEl.textContent = "Generated password copied!";
      vaultMessageEl.classList.add("success");
      setTimeout(() => {
        vaultMessageEl.textContent = "";
        vaultMessageEl.classList.remove("success");
      }, 2000);
    } catch {
      vaultMessageEl.textContent = "Failed to copy password.";
    }
  }
});

// ========== ANALYZER ==========
toggleStrength.addEventListener("click", () => {
  const type = strengthPassword.type === "password" ? "text" : "password";
  strengthPassword.type = type;
});

strengthPassword.addEventListener("input", analyzePassword);

function analyzePassword() {
  const password = strengthPassword.value;
  let score = 0;
  
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  meterFill.style.width = `${Math.min(score * 20, 100)}%`;
  meterFill.className = `meter-fill strength-${score}`;
  
  const labels = ["Too Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  strengthLabel.textContent = labels[score] || "Enter a password";
  
  rules[0].classList.toggle("met", password.length >= 12);
  rules[1].classList.toggle("met", /[A-Z]/.test(password));
  rules[2].classList.toggle("met", /[a-z]/.test(password));
  rules[3].classList.toggle("met", /\d/.test(password));
  rules[4].classList.toggle("met", /[^A-Za-z0-9]/.test(password));
}

// Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
});

// Initial load
switchPage("vault");
