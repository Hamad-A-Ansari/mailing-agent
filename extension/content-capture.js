/**
 * Content script: API Interceptor (MAIN world)
 * 
 * Runs in the page's MAIN world to intercept XHR/fetch calls from
 * SignalHire, ContactOut, Lusha, etc. Stores captured emails in
 * a global variable that the popup can read via the bridge script.
 * 
 * NO UI injection — the popup handles all UI.
 */

(function () {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  const targetDomains = [
    "signalhire.com",
    "contactout.com",
    "api.contactout.com",
    "app.contactout.com",
    "lusha.com",
    "api.lusha.com",
    "rocketreach.co",
    "wiza.co",
  ];

  // Store intercepted emails globally
  window.__sfInterceptedEmails = window.__sfInterceptedEmails || [];

  function isTargetUrl(url) {
    try {
      return targetDomains.some((domain) => url.includes(domain));
    } catch { return false; }
  }

  function extractEmailsFromResponse(text, url) {
    if (!text) return;
    const emails = text.match(emailRegex) || [];
    const validEmails = emails.filter(
      (e) => !e.includes("linkedin.com") && !e.includes("example.com") && !e.includes("sentry")
    );
    if (validEmails.length > 0) {
      console.log(`[Switch FAANG] Intercepted ${validEmails.length} email(s) from ${url}`);
      validEmails.forEach((email) => {
        const lower = email.toLowerCase();
        if (!window.__sfInterceptedEmails.includes(lower)) {
          window.__sfInterceptedEmails.push(lower);
        }
      });
      // Dispatch event so bridge can pick it up
      window.dispatchEvent(new CustomEvent("sf-emails-captured", {
        detail: { emails: window.__sfInterceptedEmails }
      }));
    }
  }

  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._sfUrl = typeof url === "string" ? url : "";
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    this.addEventListener("load", function () {
      try {
        if (this._sfUrl && isTargetUrl(this._sfUrl)) {
          extractEmailsFromResponse(this.responseText, this._sfUrl);
        }
      } catch { /* ignore */ }
    });
    return originalXHRSend.apply(this, arguments);
  };

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

    return originalFetch.apply(this, args).then((response) => {
      try {
        if (isTargetUrl(url)) {
          response.clone().text().then((text) => {
            extractEmailsFromResponse(text, url);
          }).catch(() => {});
        }
      } catch { /* ignore */ }
      return response;
    });
  };
})();
