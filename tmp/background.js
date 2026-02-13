console.log('🔒 SecurePass background v2.4 started');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVault') {
    chrome.storage.local.get(['token'], async (result) => {
      console.log('Background: Token exists?', !!result.token);
      
      if (!result.token) {
        sendResponse({ vault: [] });
        return;
      }
      
      try {
        const response = await fetch('http://localhost:3000/api/passwords', {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${result.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const vault = await response.json();
          console.log('Background: Fetched', vault.length, 'vault items');
          sendResponse({ vault });
        } else {
          console.log('Background: API error', response.status);
          sendResponse({ vault: [] });
        }
      } catch (error) {
        console.error('Background fetch error:', error.message);
        sendResponse({ vault: [] });
      }
    });
    return true; // Async response
  }
});
