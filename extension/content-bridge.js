/**
 * Bridge script: Runs in ISOLATED world.
 * 
 * 1. Listens for intercepted emails from MAIN world (via CustomEvent)
 *    and stores them in chrome.storage.local for the popup to read.
 * 2. Handles profile extraction requests from the popup.
 */

// Listen for emails captured by the MAIN world interceptor
window.addEventListener("sf-emails-captured", (event) => {
  const emails = event.detail?.emails || [];
  if (emails.length > 0) {
    chrome.storage.local.set({ interceptedEmails: emails });
    console.log("[Switch FAANG Bridge] Stored", emails.length, "intercepted emails");
  }
});

// Clear intercepted emails when navigating to a new profile
let lastProfileUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastProfileUrl) {
    lastProfileUrl = window.location.href;
    chrome.storage.local.set({ interceptedEmails: [] });
  }
});
if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
}

// Also respond to popup requests for page-scraped emails
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageEmails") {
    // Scan visible page text for emails (fallback)
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const text = document.body?.innerText || "";
    const found = (text.match(emailRegex) || [])
      .map((e) => e.toLowerCase())
      .filter((e) => !e.includes("linkedin.com") && !e.includes("licdn.com") && !e.includes("example.com"));
    const unique = [...new Set(found)];
    sendResponse({ emails: unique });
  }
  return true;
});
