console.log('🔒 SecurePass content script v2.4 - BACKGROUND ONLY');

let processedFields = new Set();

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

// **CREATE SECURE ICON**
function createSecurePassIcon(field) {
  // Remove existing icon for this field only
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
  
  // **BACKGROUND MESSAGING ONLY - NO FETCH**
  icon.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🟢 CLICK DETECTED! Background messaging...');
    
    icon.innerHTML = '⏳'; // Loading
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getVault' });
      const currentDomain = window.location.hostname.toLowerCase();
      
      console.log('🔍 Domain:', currentDomain);
      console.log('📦 Vault:', response.vault?.length || 0, 'items');
      
      if (response?.vault?.length > 0) {
        // Smart matching
        const match = response.vault.find(item => {
          const site = item.website?.toLowerCase().replace('www.', '');
          const domain = currentDomain.replace('www.', '');
          return site === domain || domain.includes(site) || site.includes(domain);
        });
        
        if (match) {
          console.log('✅ MATCH:', match.website);
          field.value = match.password;
          dispatchEvents(field);
          
          // Fill username
          const usernameField = document.querySelector(
            'input[type="email"], input[name*="email"], input[name*="user"], #email, #username, [autocomplete*="username"]'
          );
          if (usernameField && match.username) {
            usernameField.value = match.username;
            dispatchEvents(usernameField);
          }
          
          showNotification(`✅ Filled ${match.username || 'password'} for ${match.website}`);
          icon.innerHTML = '✅';
        } else {
          console.log('❌ No match. Available:', response.vault.map(i => i.website));
          showNotification(`ℹ️ Save ${currentDomain} first`);
          icon.innerHTML = '❌';
        }
      } else {
        showNotification('❌ No vault data - check popup');
        icon.innerHTML = '❌';
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('❌ Extension error');
      icon.innerHTML = '❌';
    }
    
    setTimeout(() => icon.innerHTML = '🔓', 1500);
  });
  
  // Hover effects
  icon.onmouseenter = () => icon.style.transform = 'translateY(-50%) scale(1.1)';
  icon.onmouseleave = () => icon.style.transform = 'translateY(-50%)';
}

// **INJECT ICONS**
function injectIconsToAllPasswordFields() {
  const selectors = [
    'input[type="password"]',
    'input[name*="password"]', 'input[name*="pass"]',
    'input[id*="password"]', 'input[id*="pass"]',
    '[autocomplete*="password"]'
  ];
  
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(field => {
      if (!processedFields.has(field) && isFieldVisible(field)) {
        createSecurePassIcon(field);
        processedFields.add(field);
      }
    });
  });
}

function startWatchingForNewFields() {
  const observer = new MutationObserver(injectIconsToAllPasswordFields);
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['type', 'class']
  });
  setInterval(injectIconsToAllPasswordFields, 2000);
}

// **POPUP MESSAGES**
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillNow') {
    const field = document.querySelector('input[type="password"]');
    if (field) {
      field.value = request.password;
      dispatchEvents(field);
      showNotification('✅ Filled from popup');
      sendResponse({ success: true });
    }
  }
});

// **INIT**
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SecurePass initializing...');
    injectIconsToAllPasswordFields();
    startWatchingForNewFields();
  });
} else {
  setTimeout(() => {
    console.log('🚀 SecurePass initializing...');
    injectIconsToAllPasswordFields();
    startWatchingForNewFields();
  }, 100);
}

console.log('🔒 SecurePass v2.4 loaded!');
