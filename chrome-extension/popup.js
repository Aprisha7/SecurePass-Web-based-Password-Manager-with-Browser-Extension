const API_BASE = 'http://localhost:3000/api';
const FRONTEND_BASE = "http://127.0.0.1:5501";

// State
let token = null;
let allPasswords = [];
let isUnlocked = false;
let addOverlay = null;

// Initialize
document.addEventListener('DOMContentLoaded', initPopup);

async function initPopup() {
  // ✅ Get ALL DOM elements AFTER DOM loads
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

  // Check token & show appropriate screen
  token = await getToken();
  if (token) {
    isUnlocked = true;
    showVault(loginScreen, vaultScreen);
    await loadVault(vaultItems, emptyState);
  } else {
    loginScreen.classList.add('active');
  }

  setupEventListeners(loginForm, registerLink, toggleLoginPassword, loginPassword, logoutBtn, searchInput, refreshBtn, generateBtn, fillBtn, loginEmail);
  createAddButton();
}

function setupEventListeners(loginForm, registerLink, toggleLoginPassword, loginPassword, logoutBtn, searchInput, refreshBtn, generateBtn, fillBtn, loginEmail) {
  // Password toggle
  toggleLoginPassword.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (loginPassword.type === 'password') {
      loginPassword.type = 'text';
      toggleLoginPassword.textContent = '👁';
    } else {
      loginPassword.type = 'password';
      toggleLoginPassword.textContent = '👁';
    }
  });

  loginForm.addEventListener('submit', (e) => handleLogin(e, loginEmail, loginPassword));
  registerLink.addEventListener('click', showRegister);
  logoutBtn.addEventListener('click', handleLogout);
  searchInput.addEventListener('input', debounce(handleSearch, 300));
  refreshBtn.addEventListener('click', () => loadVault(document.getElementById('vault-items'), document.getElementById('empty-state')));
  generateBtn.addEventListener('click', generatePassword);
  fillBtn.addEventListener('click', fillCurrentSite);
}

function createAddButton() {
  // Check if button already exists
  if (document.getElementById('add-new-btn')) return;
  
  // Get the vault header
  const vaultHeader = document.querySelector('.vault-header');
  if (!vaultHeader) return;
  
  // Create add button
  const addBtn = document.createElement('button');
  addBtn.innerHTML = '➕';
  addBtn.id = 'add-new-btn';
  addBtn.title = 'Add new password';
  addBtn.onclick = showAddForm;
  
  // Insert add button next to the title
  const titleElement = vaultHeader.querySelector('h2');
  if (titleElement) {
    titleElement.appendChild(addBtn); // This puts it right after the text
  } else {
    // Fallback: insert at beginning of header
    vaultHeader.insertBefore(addBtn, vaultHeader.firstChild);
  }
  
  // Hide if not unlocked
  if (!isUnlocked) addBtn.style.display = 'none';
  
  createAddOverlay();
}

function createAddOverlay() {
  addOverlay = document.createElement('div');
  addOverlay.style.cssText = `
    display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); z-index: 9999;
  `;
  
  addOverlay.innerHTML = `
    <div style="background: white; position: absolute; top: 50%; left: 50%; 
                transform: translate(-50%, -50%); padding: 24px; border-radius: 12px; 
                max-width: 320px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 20px; font-weight: 600;">Add New Password</h3>
        <button id="close-add-overlay" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0;">×</button>
      </div>
      <input id="new-website" type="text" placeholder="https://www.example.com" style="width: 100%; padding: 14px; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 14px;">
      <input id="new-username" type="text" placeholder="username@example.com" style="width: 100%; padding: 14px; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 14px;">
      <div style="position: relative; margin-bottom: 16px;">
        <input id="new-password" type="password" placeholder="••••••••" style="width: 100%; padding: 14px 45px 14px 14px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; font-size: 14px;">
        <button id="toggle-new-password" type="button" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 16px; cursor: pointer; color: #666;">👁</button>
      </div>
      <button id="save-new-password" style="width: 100%; padding: 14px; background: #10b981; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;">Save Password</button>
    </div>
  `;
  
  document.body.appendChild(addOverlay);
  
  // ✅ FIXED: Proper event listeners - NO DUPLICATES
  addOverlay.querySelector('#close-add-overlay').onclick = hideAddForm;
  addOverlay.querySelector('#toggle-new-password').onclick = function() {
    const pwd = document.getElementById('new-password');
    pwd.type = pwd.type === 'password' ? 'text' : 'password';
    this.textContent = pwd.type === 'password' ? '👁' : '👁';
  };
  addOverlay.querySelector('#save-new-password').onclick = saveNewPassword;
}

function showAddForm() {
  addOverlay.style.display = 'block';
  document.getElementById('new-website').focus();
}

function hideAddForm() {
  addOverlay.style.display = 'none';
  document.getElementById('new-website').value = '';
  document.getElementById('new-username').value = '';
  document.getElementById('new-password').value = '';
}

async function saveNewPassword() {
  const website = document.getElementById('new-website').value.trim();
  const username = document.getElementById('new-username').value.trim();
  const password = document.getElementById('new-password').value;
  
  if (!website || !username || !password) {
    showMessage('All fields are required', 'error');
    return;
  }
  
  if (!/^https?:\/\/.+/.test(website)) {
    showMessage('❌ Full URL required (https://example.com)', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/passwords/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ website, username, password })
    });
    
    if (response.ok) {
      showMessage('✅ Password saved successfully!', 'success');
      hideAddForm();
      loadVault(document.getElementById('vault-items'), document.getElementById('empty-state'));
    } else {
      const data = await response.json();
      showMessage(data.error || 'Failed to save', 'error');
    }
  } catch (error) {
    showMessage('Network error', 'error');
  }
}

async function handleLogin(e, loginEmail, loginPassword) {
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
    showVault(document.getElementById('login-screen'), document.getElementById('vault-screen'));
    await loadVault(document.getElementById('vault-items'), document.getElementById('empty-state'));
    showMessage('Welcome back!', 'success');
    
  } catch (error) {
    showMessage('Server offline. Is backend running?', 'error');
  }
}

function showRegister(e) {
  e.preventDefault();
  chrome.tabs.create({ 
    url: "C:/Users/ASUS/Desktop/FYP/frontend/login.html" 
  });
  window.close();
}

function showVault(loginScreen, vaultScreen) {
  loginScreen.classList.remove('active');
  vaultScreen.classList.add('active');
  const addBtn = document.getElementById('add-new-btn');
  const headerContainer = document.getElementById('header-actions');
  if (addBtn && headerContainer) {
    addBtn.style.display = 'flex';
    headerContainer.style.display = 'flex';
  }
}

function handleLogout() {
  token = null;
  isUnlocked = false;
  chrome.storage.local.remove('token');
  
  const loginScreen = document.getElementById('login-screen');
  const vaultScreen = document.getElementById('vault-screen');
  const vaultItems = document.getElementById('vault-items');
  const emptyState = document.getElementById('empty-state');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  
  loginScreen.classList.add('active');
  vaultScreen.classList.remove('active');
  vaultItems.innerHTML = '';
  loginEmail.value = '';
  loginPassword.value = '';
  emptyState.style.display = 'none';
  
  const addBtn = document.getElementById('add-new-btn');
  const headerContainer = document.getElementById('header-actions');
  if (addBtn) addBtn.style.display = 'none';
  if (headerContainer) headerContainer.style.display = 'none';
}

async function loadVault(vaultItems, emptyState) {
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
    renderVault(vaultItems, emptyState, data);
    
  } catch (error) {
    showMessage('Cannot connect to server', 'error');
  }
}

function renderVault(vaultItems, emptyState, items = []) {
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
    if (copyBtn) {
      copyBtn.style.cssText = `
        background: #dbeafe; color: #1e40af; border: 2px solid #bfdbfe;
        width: 36px; height: 36px; border-radius: 8px; font-size: 16px;
        margin-left: 8px; cursor: pointer; transition: all 0.2s ease;
      `;
      copyBtn.onmouseover = () => {
        copyBtn.style.background = '#bfdbfe';
        copyBtn.style.transform = 'scale(1.05)';
      };
      copyBtn.onmouseout = () => {
        copyBtn.style.background = '#dbeafe';
        copyBtn.style.transform = 'scale(1)';
      };
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyPassword(item);
      });
    }
    
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
  const query = document.getElementById('search-input').value.toLowerCase().trim();
  if (!query) {
    renderVault(document.getElementById('vault-items'), document.getElementById('empty-state'), allPasswords);
    return;
  }
  
  const filtered = allPasswords.filter(item =>
    item.website?.toLowerCase().includes(query) ||
    item.username?.toLowerCase().includes(query)
  );
  
  renderVault(document.getElementById('vault-items'), document.getElementById('empty-state'), filtered);
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
    
    console.log('🔍 Fill Site → URL:', url);
    console.log('📦 Vault sites:', allPasswords.map(p => p.website));
    
    const match = allPasswords.find(item => {
      const site = item.website?.toLowerCase().replace('www.', '');
      const domain = url.replace('www.', '');
      return site === domain || domain.includes(site) || site.includes(domain);
    });
    
    if (!match) {
      showMessage(`No password for ${url.replace('www.', '')}`, 'error');
      console.log('❌ No match found');
      return;
    }
    
    console.log('✅ MATCH:', match.website);
    
    chrome.tabs.sendMessage(tab[0].id, { 
      action: 'fillNow',
      credentials: match
    }, (response) => {
      if (response?.success) {
        showMessage(`✅ Autofilled ${match.website}!`, 'success');
      } else {
        showMessage(`✅ Ready for ${match.website}`, 'success');
      }
      window.close();
    });
    
  } catch (error) {
    console.error('Fill error:', error);
    showMessage('No active tab or extension error', 'error');
  }
}

function showMessage(text, type = 'success') {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.classList.remove('hidden');
  
  setTimeout(() => {
    messageEl.classList.add('hidden');
  }, 3000);
}

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
