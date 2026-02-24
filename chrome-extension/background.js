console.log('🔒 SecurePass Background v3.0 - Auto-Save Ready');

// Store vault globally
let vaultCache = [];
let token = null;

// Listen for messages from content script/popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background message:', request.action);
  
  switch (request.action) {
    case 'getVault':
      sendResponse({ vault: vaultCache });
      break;
      
    case 'saveCredentials':
      handleSaveCredentials(request.credentials, sendResponse);
      break;
      
    case 'getToken':
      sendResponse({ token });
      break;
      
    case 'setToken':
      token = request.token;
      chrome.storage.local.set({ token });
      sendResponse({ success: true });
      break;
  }
  
  return true; // Keep message channel open
});

async function handleSaveCredentials(credentials, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['token']);
    const token = result.token;
    
    if (!token) {
      console.log('❌ NO TOKEN');
      sendResponse({ success: false, error: 'Login first' });
      return;
    }
    
    console.log('💾 Auto-saving:', credentials);
    
    // ✅ FIXED: Use YOUR endpoint /add
    const response = await fetch('http://localhost:3000/api/passwords/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    console.log('📡 Response:', response.status);
    
    if (response.ok) {
      vaultCache.push(credentials);
      sendResponse({ success: true });
      console.log('✅ AUTO-SAVE SUCCESS!');
    } else {
      const errorText = await response.text();
      console.log('❌ Backend:', response.status, errorText.slice(0, 100));
      sendResponse({ success: false, error: `Error ${response.status}` });
    }
  } catch (error) {
    console.error('💥 Network:', error.message);
    sendResponse({ success: false, error: error.message });
  }
}



// Sync vault on extension load
chrome.runtime.onStartup.addListener(async () => {
  const result = await chrome.storage.local.get(['vault', 'token']);
  vaultCache = result.vault || [];
  token = result.token;
});

console.log('🔒 SecurePass Background ready!');
