console.log('🔒 SecurePass content script v3.3 - Backend Token Fix');

let processedFields = new Set();
let savePromptShown = false;
let recentSaves = new Set();

// **HELPER FUNCTIONS**
function dispatchEvents(field) {
  ['input', 'change', 'keyup', 'focus'].forEach(type => {
    field.dispatchEvent(new Event(type, { bubbles: true }));
  });
}

function showNotification(msg, type = 'success') {
  const notif = document.createElement('div');
  notif.textContent = msg;
  notif.style.cssText = `
    position: fixed; top: 20px; right: 20px; 
    background: ${type === 'error' ? '#ef4444' : '#10b981'}; 
    color: white; padding: 12px 20px; border-radius: 8px; 
    z-index: 999999; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

function isFieldVisible(field) {
  const rect = field.getBoundingClientRect();
  const style = window.getComputedStyle(field);
  return rect.width > 0 && rect.height > 0 && 
         style.display !== 'none' && style.visibility !== 'hidden';
}

// ✅ FIXED: Direct backend call with token (NO getVault message)
function createSecurePassIcon(field) {
  const existing = field.parentElement.querySelector('.securepass-icon');
  if (existing) existing.remove();
  
  field.style.paddingRight = '45px';
  const container = field.parentElement;
  container.style.position = 'relative';
  
  const icon = document.createElement('div');
  icon.className = 'securepass-icon';
  icon.innerHTML = '🔓';
  
  icon.style.cssText = `
    position: absolute !important; right: 12px !important; top: 50% !important;
    transform: translateY(-50%) !important; width: 28px !important; height: 28px !important;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8) !important;
    border: 2px solid white !important; border-radius: 50% !important;
    display: flex !important; align-items: center !important; justify-content: center !important;
    font-size: 13px !important; cursor: pointer !important; z-index: 2147483647 !important;
    box-shadow: 0 2px 12px rgba(59,130,246,0.5) !important; transition: all 0.2s !important;
  `;
  
  container.appendChild(icon);
  
  icon.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🟢 CLICK DETECTED!');
    
    icon.innerHTML = '⏳';

    chrome.storage.local.get(['token'], async (result) => {
      if (!result.token) {
        showNotification('❌ No vault data - login in popup');
        icon.innerHTML = '❌';
        setTimeout(() => icon.innerHTML = '🔓', 1500);
        return;
      }
      
      try {
        const currentFullUrl = window.location.href.toLowerCase();
        const currentHostname = window.location.hostname.replace('www.', '').toLowerCase();
        
        console.log('🔍 Current URL:', currentFullUrl);
        
        const response = await fetch('http://localhost:3000/api/passwords', {
          headers: { 'Authorization': `Bearer ${result.token}` }
        });
        
        if (response.ok) {
          const vault = await response.json();
          console.log('📦 Vault:', vault.length, 'items');
          
          const match = vault.find(item => {
            const savedUrl = item.website?.toLowerCase();
            if (!savedUrl) return false;
            
            // ✅ FIXED: Safe URL parsing
            let savedHostname = '';
            try {
              savedHostname = new URL(savedUrl.startsWith('http') ? savedUrl : 'https://' + savedUrl)
                .hostname.replace('www.', '').toLowerCase();
            } catch (e) {
              console.log('⚠️ Invalid URL in vault:', savedUrl);
              return false;
            }
            
            return savedUrl === currentFullUrl || 
                   savedHostname === currentHostname || 
                   currentFullUrl.includes(savedHostname);
          });
          
          if (match) {
            console.log('✅ MATCH FOUND:', match.website);
            field.value = match.password;
            dispatchEvents(field);
            
            const usernameField = document.querySelector(
              'input[type="email"], input[name*="email"], input[name*="user"], #email, #username, [autocomplete*="username"]'
            );
            if (usernameField && match.username) {
              usernameField.value = match.username;
              dispatchEvents(usernameField);
            }
            
            showNotification(`✅ Filled for ${match.website}`);
            icon.innerHTML = '✅';
          } else {
            showNotification(`ℹ️ Save ${currentHostname} first`);
            icon.innerHTML = '💾';
          }
        } else {
          showNotification('❌ Session expired');
          icon.innerHTML = '❌';
        }
      } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Network error');
        icon.innerHTML = '❌';
      }
      
      setTimeout(() => icon.innerHTML = '🔓', 1500);
    });
  });
  
  icon.onmouseenter = () => icon.style.transform = 'translateY(-50%) scale(1.1)';
  icon.onmouseleave = () => icon.style.transform = 'translateY(-50%)';
}


// **AUTO-SAVE FUNCTION (Updated for backend)**
async function setupAutoSave() {
  if (savePromptShown) return;
  
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    if (form.dataset.securepassListener) return;
    form.dataset.securepassListener = 'true';
    
    form.addEventListener('submit', async (e) => {
      if (savePromptShown) return;
      
      const passwordField = document.querySelector('input[type="password"]');
      const usernameField = document.querySelector(
        'input[type="email"], input[name*="email"], input[name*="user"], #email, #username'
      );
      
      if (!passwordField?.value || !usernameField?.value) return;
      
      const fullUrl = window.location.href;
      console.log('🌐 Full URL:', fullUrl);
      
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(fullUrl)) {
        console.log('❌ Invalid URL - must be full https://');
        showNotification('❌ Full URL required (https://...)', 'error');
        return;
      }
      
      const saveKey = `${fullUrl}_${usernameField.value}`;
      if (recentSaves.has(saveKey)) {
        console.log('⏭️ Skip recent save:', saveKey);
        return;
      }
      
      savePromptShown = true;
      e.preventDefault();
      
      try {
        // Check if already exists
        chrome.storage.local.get(['token'], async (result) => {
          if (!result.token) {
            savePromptShown = false;
            return;
          }
          
          const checkResponse = await fetch('http://localhost:3000/api/passwords', {
            headers: { 'Authorization': `Bearer ${result.token}` }
          });
          
          if (checkResponse.ok) {
            const vault = await checkResponse.json();
            const exists = vault.some(item => 
              item.website === fullUrl && 
              item.username?.toLowerCase() === usernameField.value.toLowerCase()
            );
            
            if (exists) {
              showNotification(`✅ Already saved for ${new URL(fullUrl).hostname}`);
              setTimeout(() => form.submit(), 500);
              savePromptShown = false;
              return;
            }
          }
          
          // Show save prompt
          const saveIt = confirm(
            `💾 Save for FULL URL?\n\n` +
            `🌐 ${fullUrl.slice(0, 60)}${fullUrl.length > 60 ? '...' : ''}\n` +
            `👤 ${usernameField.value}\n` +
            `🔑 ••••••••`
          );
          
          if (saveIt) {
            const credentials = {
              website: fullUrl,
              username: usernameField.value,
              password: passwordField.value
            };
            
            const saveResponse = await fetch('http://localhost:3000/api/passwords/add', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${result.token}`
              },
              body: JSON.stringify(credentials)
            });
            
            if (saveResponse.ok) {
              recentSaves.add(saveKey);
              setTimeout(() => recentSaves.delete(saveKey), 5 * 60 * 1000);
              showNotification(`✅ Saved ${new URL(fullUrl).hostname}!`);
            } else {
              const errorData = await saveResponse.json();
              showNotification(`❌ ${errorData.error || 'Save failed'}`, 'error');
            }
          }
          
          savePromptShown = false;
          setTimeout(() => form.submit(), 500);
        });
      } catch (error) {
        console.error('Auto-save error:', error);
        savePromptShown = false;
        setTimeout(() => form.submit(), 500);
      }
    });
  });
}

// **INJECT ICONS**
function injectIconsToAllPasswordFields() {
  const selectors = [
   'input[type="password"]',                    // Actual password inputs
    'input[autocomplete="new-password"]',         // New password fields
    'input[autocomplete="current-password"]',     // Current password fields
    'input[name$="password" i]',                   // Ends with "password"
    'input[name$="pass" i]',                       // Ends with "pass"
    'input[id$="password" i]',                      // Ends with "password"
    'input[id$="pass" i]',                          // Ends with "pass"
    'input[placeholder*="password" i]',             // Placeholder contains password
    'input[placeholder*="pass" i]'   
  ];
  
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(field => {
      const isSearchField = 
        field.id?.toLowerCase().includes('search') ||
        field.name?.toLowerCase().includes('search') ||
        field.placeholder?.toLowerCase().includes('search') ||
        field.className?.toLowerCase().includes('search') ||
        field.type === 'search' ||
        field.getAttribute('aria-label')?.toLowerCase().includes('search');
      
      if (isSearchField) {
        return; // Skip this field
      }
      
      const isGeneratorField = 
        field.id?.toLowerCase().includes('gen-password') ||
        field.id?.toLowerCase().includes('generated') ||
        field.placeholder?.toLowerCase().includes('generate') ||
        field.readOnly || // Generator fields are often read-only
        field.disabled;   // Generator fields might be disabled
      
      if (isGeneratorField) {
        console.log('⚡ Skipping generator field:', field);
        return; // Skip generator fields
      }
      
      if (!processedFields.has(field) && isFieldVisible(field)) {
        createSecurePassIcon(field);
        processedFields.add(field);
      }
    });
  });
}
    

function startWatchingForNewFields() {
  const observer = new MutationObserver(() => {
    injectIconsToAllPasswordFields();
    setupAutoSave();
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['type', 'class']
  });
  
  setInterval(() => {
    injectIconsToAllPasswordFields();
    setupAutoSave();
  }, 2000);
}

// **MESSAGE HANDLERS** (Popup → Content)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillNow' && request.credentials) {
    const passwordField = document.querySelector('input[type="password"]');
    const usernameField = document.querySelector('input[type="email"], input[name*="email"], input[name*="user"]');
    
    if (passwordField) {
      passwordField.value = request.credentials.password;
      dispatchEvents(passwordField);
      
      if (usernameField && request.credentials.username) {
        usernameField.value = request.credentials.username;
        dispatchEvents(usernameField);
      }
      
      showNotification(`✅ Filled ${request.credentials.website}!`);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
  }
  return true;
});

// **INIT**
function initSecurePass() {
  console.log('🚀 SecurePass v3.3 initializing...');
  injectIconsToAllPasswordFields();
  startWatchingForNewFields();
  setupAutoSave();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSecurePass);
} else {
  setTimeout(initSecurePass, 100);
}

console.log('🔒 SecurePass v3.3 - Backend Token Integration Ready!');
