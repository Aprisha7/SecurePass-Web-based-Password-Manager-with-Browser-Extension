const API_BASE = 'http://localhost:3000/api';
const FRONTEND_BASE = "http://127.0.0.1:5501";

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const vaultScreen = document.getElementById('vault-screen');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const toggleLoginPassword = document.getElementById('toggle-login-password');
const logoutBtn = document.getElementById('logout-btn');
const registerLink = document.getElementById('register-link');
const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const vaultItems = document.getElementById('vault-items');
const emptyState = document.getElementById('empty-state');
const messageEl = document.getElementById('message');
const generateBtn = document.getElementById('generate-btn');
const fillBtn = document.getElementById('fill-btn');

// State
let token = null;
let allPasswords = [];
let isUnlocked = false;

// Initialize
document.addEventListener('DOMContentLoaded', initPopup);

async function initPopup() {
  token = await getToken();
  if (token) {
    isUnlocked = true;
    showVault();
    await loadVault();
  }
  setupEventListeners();
}

function setupEventListeners() {
  // ✅ FIXED: Password toggle with eye icon change
  toggleLoginPassword.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (loginPassword.type === 'password') {
      loginPassword.type = 'text';
      toggleLoginPassword.textContent = '🙈';
    } else {
      loginPassword.type = 'password';
      toggleLoginPassword.textContent = '👁';
    }
  });

  loginForm.addEventListener('submit', handleLogin);
  registerLink.addEventListener('click', showRegister);
  logoutBtn.addEventListener('click', handleLogout);
  searchInput.addEventListener('input', debounce(handleSearch, 300));
  refreshBtn.addEventListener('click', loadVault);
  generateBtn.addEventListener('click', generatePassword);
  fillBtn.addEventListener('click', fillCurrentSite);
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  
  if (!email || !password) {
    showMessage('Please fill all fields', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, masterPassword: password })
    });

    const data = await response.json();
    
    if (!response.ok) {
      showMessage(data.error || 'Login failed', 'error');
      return;
    }

    token = data.token;
    await setToken(token);
    isUnlocked = true;
    showVault();
    await loadVault();
    showMessage('Welcome back!', 'success');
    
  } catch (error) {
    showMessage('Server offline. Is backend running?', 'error');
  }
}

function showRegister(e) {
  e.preventDefault();
  // Opens your frontend register page
  chrome.tabs.create({ 
    url: "C:/Users/ASUS/Desktop/FYP/frontend/login.html" 
  });
  window.close(); // Close popup
}

function showVault() {
  loginScreen.classList.remove('active');
  vaultScreen.classList.add('active');
}

function handleLogout() {
  token = null;
  isUnlocked = false;
  chrome.storage.local.remove('token');
  loginScreen.classList.add('active');
  vaultScreen.classList.remove('active');
  vaultItems.innerHTML = '';
  loginEmail.value = '';
  loginPassword.value = '';
  emptyState.style.display = 'none';
}

async function loadVault() {
  if (!token || !isUnlocked) return;
  
  try {
    const response = await fetch(`${API_BASE}/passwords`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      showMessage('Session expired. Please login again', 'error');
      handleLogout();
      return;
    }

    const data = await response.json();
    allPasswords = data;
    renderVault(allPasswords);
    
  } catch (error) {
    showMessage('Cannot connect to server', 'error');
  }
}

function renderVault(items = []) {
  vaultItems.innerHTML = '';
  
  if (items.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'vault-item';
    div.innerHTML = `
      <div>
        <div class="vault-site">${item.website || 'Unknown'}</div>
        <div class="vault-username">${item.username || ''}</div>
      </div>
      <div class="vault-actions">
        <button class="icon-btn copy-btn" title="Copy Password">📋</button>
      </div>
    `;
    
    div.addEventListener('click', (e) => {
      if (e.target.classList.contains('copy-btn')) return;
      copyPassword(item);
    });
    
    const copyBtn = div.querySelector('.copy-btn');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyPassword(item);
    });
    
    vaultItems.appendChild(div);
  });
}

async function copyPassword(item) {
  try {
    await navigator.clipboard.writeText(item.password);
    showMessage(`Copied ${item.website} password!`, 'success');
    setTimeout(() => window.close(), 1500);
  } catch (error) {
    showMessage('Failed to copy password', 'error');
  }
}

function handleSearch() {
  const query = searchInput.value.toLowerCase().trim();
  if (!query) {
    renderVault(allPasswords);
    return;
  }
  
  const filtered = allPasswords.filter(item =>
    item.website?.toLowerCase().includes(query) ||
    item.username?.toLowerCase().includes(query)
  );
  
  renderVault(filtered);
}

async function generatePassword() {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let password = '';
  
  for (let i = 0; i < 16; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  await navigator.clipboard.writeText(password);
  showMessage('Generated password copied!', 'success');
  setTimeout(() => window.close(), 1000);
}

async function fillCurrentSite() {
  try {
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab[0].url).hostname.toLowerCase();
    
    const sitePasswords = allPasswords.filter(p => 
      p.website?.toLowerCase().includes(url)
    );
    
    if (sitePasswords.length === 0) {
      showMessage('No password found for this site', 'error');
      return;
    }
    
    await copyPassword(sitePasswords[0]);
    
  } catch (error) {
    showMessage('Cannot detect current site', 'error');
  }
}

// **NEW** - Direct content script communication for icon clicks
async function triggerContentScriptAutofill(password, username = null) {
  try {
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab[0].id, { 
      action: 'getPasswordForCurrentSite',
      url: new URL(tab[0].url).hostname,
      password: password,
      username: username
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Content script autofill triggered');
      }
    });
    
    showMessage('🔒 Password sent to page!', 'success');
  } catch (error) {
    showMessage('Autofill ready - click blue icon on page', 'info');
  }
}

// **UPDATED** fillCurrentSite() - Now works with content script
async function fillCurrentSite() {
  try {
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab[0].url).hostname.toLowerCase();
    
    const sitePasswords = allPasswords.filter(p => 
      p.website?.toLowerCase().includes(url)
    );
    
    if (sitePasswords.length === 0) {
      showMessage('No password found for this site', 'error');
      return;
    }
    
    const passwordData = sitePasswords[0];
    
    // **NEW** - Send to content script for icon autofill
    await triggerContentScriptAutofill(passwordData.password, passwordData.username);
    
  } catch (error) {
    showMessage('Cannot detect current site', 'error');
  }
}

function showMessage(text, type = 'success') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.classList.remove('hidden');
  
  setTimeout(() => {
    messageEl.classList.add('hidden');
  }, 3000);
}

// Storage helpers
async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['token'], (result) => {
      resolve(result.token || null);
    });
  });
}

async function setToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ token }, () => {
      resolve();
    });
  });
}

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
