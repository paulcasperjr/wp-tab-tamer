/**
 * WP Tab Tamer
 * By Paul Impellizeri (Sustain Sites LLC)
 * * A surgical tool for WordPress users to manage preview tab bloat.
 */

// 1. Initialize Extension and Context Menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "toggleWPTabTamer",
    title: "Disable WP Tab Tamer",
    contexts: ["action"]
  });
  chrome.storage.local.set({ extensionEnabled: true });
});

// 2. Handle the Toggle Switch
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "toggleWPTabTamer") {
    const data = await chrome.storage.local.get("extensionEnabled");
    const newState = !data.extensionEnabled;
    await chrome.storage.local.set({ extensionEnabled: newState });
    chrome.contextMenus.update("toggleWPTabTamer", {
      title: newState ? "Disable WP Tab Tamer" : "Enable WP Tab Tamer"
    });
  }
});

// 3. Monitor for WordPress Previews
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // We trigger on 'complete' to ensure the URL is stable
  if (changeInfo.status === "complete" && tab.url && tab.url.startsWith("http")) {
    
    // Check if this tab was opened from a WordPress Dashboard
    if (tab.openerTabId) {
      chrome.tabs.get(tab.openerTabId, (openerTab) => {
        if (chrome.runtime.lastError || !openerTab) return;

        const isFromWP = openerTab.url.includes("/wp-admin/");
        const isNotDashboard = !tab.url.includes("/wp-admin/");
        
        // If it came from WP and isn't a dashboard tab, run the 'tamer'
        if (isFromWP && isNotDashboard) {
          setTimeout(checkForDuplicates, 1000);
        }
      });
    }
  }
});

// 4. The Taming Logic: Keep Newest, Close Oldest
async function checkForDuplicates() {
  const data = await chrome.storage.local.get("extensionEnabled");
  if (data.extensionEnabled === false) return;

  chrome.tabs.query({ windowType: 'normal' }, (tabs) => {
    const urlMap = new Map();
    const idsToRemove = [];

    // Sort by ID (Lowest ID = Oldest)
    tabs.sort((a, b) => a.id - b.id);

    tabs.forEach(tab => {
      if (!tab.url || !tab.url.startsWith('http')) return;

      if (urlMap.has(tab.url)) {
        // We found a duplicate! Close the older ID stored in our map.
        idsToRemove.push(urlMap.get(tab.url));
        // Keep this newer tab ID as the reference for this URL
        urlMap.set(tab.url, tab.id);
      } else {
        urlMap.set(tab.url, tab.id);
      }
    });

    if (idsToRemove.length > 0) {
      chrome.tabs.remove([...new Set(idsToRemove)]).catch(() => {
        /* Silence errors if tab was manually closed */
      });
    }
  });
}