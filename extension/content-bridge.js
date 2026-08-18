/**
 * Bridge script: Runs in ISOLATED world.
 * Listens for messages from the MAIN world content-capture.js
 * and provides chrome.storage access + API calls with credentials.
 */

const DEFAULT_API_URL = "https://switch-faang.vercel.app";

// Listen for messages from the MAIN world script
window.addEventListener("message", async (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.source !== "sf-capture") return;

  const { action, payload, requestId } = event.data;

  if (action === "getApiUrl") {
    const result = await chrome.storage.sync.get(["apiUrl"]);
    window.postMessage({ source: "sf-bridge", requestId, data: result.apiUrl || DEFAULT_API_URL }, "*");
  }

  if (action === "saveContact") {
    const result = await chrome.storage.sync.get(["apiUrl"]);
    const apiUrl = result.apiUrl || DEFAULT_API_URL;

    try {
      const res = await fetch(`${apiUrl}/api/recruiters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        window.postMessage({ source: "sf-bridge", requestId, error: err.error || `HTTP ${res.status}` }, "*");
      } else {
        const data = await res.json();
        window.postMessage({ source: "sf-bridge", requestId, data }, "*");
      }
    } catch (err) {
      window.postMessage({ source: "sf-bridge", requestId, error: err.message || "Network error" }, "*");
    }
  }
});
