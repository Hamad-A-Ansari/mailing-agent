/**
 * Content script: Email Tool Capture + API Interceptor
 * 
 * Two-pronged approach:
 * 1. Floating panel with paste-able email field (manual fallback)
 * 2. XHR/Fetch interceptor that catches SignalHire/ContactOut API responses
 *    and auto-fills the panel with captured email data
 */

const APP_URL = "https://switch-faang.vercel.app";

// Store intercepted emails from API calls
let interceptedEmails = [];

// ─── API Interceptor ─────────────────────────────────────────────────────────
// Monkey-patch XMLHttpRequest and fetch to intercept SignalHire/ContactOut responses

(function setupInterceptor() {
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

  function isTargetUrl(url) {
    return targetDomains.some((domain) => url.includes(domain));
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
        if (!interceptedEmails.includes(email.toLowerCase())) {
          interceptedEmails.push(email.toLowerCase());
        }
      });
      // Auto-fill the panel if it exists
      updatePanelEmails();
    }
  }

  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._sfUrl = url;
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
      if (isTargetUrl(url)) {
        // Clone the response so we can read it without consuming the original
        response.clone().text().then((text) => {
          extractEmailsFromResponse(text, url);
        }).catch(() => {});
      }
      return response;
    });
  };
})();

// ─── Update panel emails field ────────────────────────────────────────────────

function updatePanelEmails() {
  const emailField = document.getElementById("sf-emails");
  if (emailField && interceptedEmails.length > 0) {
    const existing = emailField.value.trim();
    const existingEmails = existing ? existing.split(/[\n,]+/).map((e) => e.trim().toLowerCase()) : [];
    const newEmails = interceptedEmails.filter((e) => !existingEmails.includes(e));
    if (newEmails.length > 0) {
      emailField.value = [...existingEmails.filter(Boolean), ...newEmails].join("\n");
      // Flash the button to indicate new data
      const btn = document.getElementById("sf-capture-action");
      if (btn) {
        btn.style.animation = "none";
        btn.offsetHeight; // trigger reflow
        btn.style.animation = "sf-pulse 0.5s ease 2";
      }
    }
  }
}

// ─── Profile extraction ──────────────────────────────────────────────────────

function extractProfileData() {
  const profile = { name: "", title: "", company: "", location: "", linkedin_url: window.location.href.split("?")[0] };

  // Name
  const nameSelectors = ['h1.text-heading-xlarge', 'h1[class*="text-heading"]', 'h1[class*="artdeco"]', 'main section h1', 'main h1', 'h1'];
  for (const sel of nameSelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent?.trim() && el.textContent.trim().length < 80) {
      profile.name = el.textContent.trim();
      break;
    }
  }

  // Title
  const titleSelectors = ['.text-body-medium[data-generated-suggestion-target]', 'main .text-body-medium', 'main section .text-body-medium', 'div.text-body-medium'];
  for (const sel of titleSelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent?.trim()) { profile.title = el.textContent.trim(); break; }
  }

  // Company
  const companySelectors = ['button[aria-label*="Current company"] span', 'main a[href*="/company/"] span', '.ph5 ul li button span[aria-hidden="true"]'];
  for (const sel of companySelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent?.trim()) { profile.company = el.textContent.trim(); break; }
  }
  if (!profile.company && profile.title) {
    const m = profile.title.match(/(?:at|@|,)\s+([^|·•,]+)/i);
    if (m) profile.company = m[1].trim();
  }

  // Location
  const locSelectors = ['.text-body-small.inline.t-black--light.break-words', 'main .text-body-small[class*="break-words"]'];
  for (const sel of locSelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent?.trim() && !el.textContent.includes('connection')) { profile.location = el.textContent.trim(); break; }
  }

  return profile;
}

// ─── Email scraping (page scan) ──────────────────────────────────────────────

function scrapePageEmails() {
  const emails = new Set();
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  // Scan body text
  const found = (document.body.innerText || "").match(emailRegex) || [];
  found.forEach((e) => {
    const lower = e.toLowerCase();
    if (!lower.includes("linkedin.com") && !lower.includes("licdn.com") && !lower.includes("example.com") && !lower.endsWith(".png") && !lower.endsWith(".svg")) {
      emails.add(lower);
    }
  });

  // Check mailto links
  document.querySelectorAll('a[href^="mailto:"]').forEach((el) => {
    const e = el.href.replace("mailto:", "").split("?")[0].trim().toLowerCase();
    if (e.includes("@") && !e.includes("linkedin.com")) emails.add(e);
  });

  return [...emails];
}

// ─── Inject floating button + panel ──────────────────────────────────────────

function injectUI() {
  if (document.getElementById("sf-capture-btn")) return;

  const container = document.createElement("div");
  container.id = "sf-capture-btn";
  container.innerHTML = `
    <button id="sf-capture-action" title="Save contact to Switch FAANG">
      <svg width="16" height="14" viewBox="0 0 39 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.4565 4.74H23.59c.32 0 .63.01.94.04.75.06 1.47-.3 1.84-.95.7-1.21-.1-2.74-1.49-2.86-.43-.04-.86-.05-1.3-.05H15.51C7.07.92-.06 7.82 0 16.27c.03 4.16 1.73 7.93 4.47 10.67 2.75 2.76 6.56 4.46 10.77 4.46h8.35c.44 0 .87-.02 1.29-.05 1.39-.12 2.19-1.65 1.49-2.86-.37-.65-1.09-1.01-1.84-.95-.31.03-.63.04-.94.04h-8.35c-6.39 0-11.57-5.27-11.41-11.69.15-6.23 5.39-11.14 11.63-11.14Z" fill="white"/>
        <path d="M29.88 9.9a9.5 9.5 0 0 0-1.6-1.27c-.38-.24-.83-.3-1.26-.2-.44.11-.8.39-1.03.78-.14.25-.22.53-.22.81 0 .57.29 1.1.79 1.41 1.65 1.03 2.63 2.8 2.63 4.73 0 1.93-.98 3.7-2.63 4.73-.76.48-1.01 1.45-.57 2.22.29.51.84.82 1.42.82.3 0 .6-.08.86-.24 2.63-1.63 4.19-4.44 4.19-7.53 0-2.37-.92-4.59-2.59-6.26Z" fill="#DDDFFF"/>
        <path d="M24.73 18.44a2.28 2.28 0 1 1 0-4.56 2.28 2.28 0 0 1 0 4.56Z" fill="white"/>
        <path d="M38.83 16.16c0 5.48-2.89 10.28-7.22 12.96-.31.19-.66.28-1 .28-.66 0-1.31-.35-1.67-.96-.52-.91-.21-2.04.67-2.6 3.23-2.02 5.38-5.6 5.38-9.68 0-4.08-2.15-7.67-5.38-9.68-.59-.37-.93-1.01-.93-1.66 0-.32.08-.64.25-.94.54-.94 1.75-1.25 2.67-.68 1 .62 1.93 1.35 2.75 2.19 2.76 2.76 4.46 6.57 4.46 10.77Z" fill="#DDDFFF"/>
      </svg>
      <span id="sf-btn-text">Save</span>
    </button>
    <div id="sf-capture-panel" style="display:none;">
      <div class="sf-panel-header">
        <span>Save to Switch FAANG</span>
        <button id="sf-panel-close">&times;</button>
      </div>
      <div class="sf-panel-body">
        <div class="sf-field"><label>Name</label><input id="sf-name" type="text" placeholder="Full name" /></div>
        <div class="sf-field"><label>Company</label><input id="sf-company" type="text" placeholder="Company" /></div>
        <div class="sf-field"><label>Title</label><input id="sf-title" type="text" placeholder="Job title" /></div>
        <div class="sf-field">
          <label>Emails <span style="color:#10b981;">(auto-captured or paste here)</span></label>
          <textarea id="sf-emails" rows="3" placeholder="Emails will auto-fill from ContactOut/SignalHire, or paste manually..."></textarea>
        </div>
        <div class="sf-field">
          <label>Role</label>
          <select id="sf-role">
            <option value="Recruiter">Recruiter</option>
            <option value="Software Developer">Software Developer</option>
            <option value="Engineering Manager">Engineering Manager</option>
            <option value="Hiring Manager">Hiring Manager</option>
            <option value="Director">Director</option>
            <option value="VP">VP</option>
            <option value="Talent Sourcer">Talent Sourcer</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <button id="sf-save-contact">Save Contact</button>
        <div id="sf-panel-status"></div>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #sf-capture-btn { position:fixed; bottom:24px; right:24px; z-index:2147483647; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    #sf-capture-action { display:flex; align-items:center; gap:6px; background:linear-gradient(135deg,#10b981,#0d9488); color:white; border:none; border-radius:10px; padding:10px 16px; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 4px 12px rgba(16,185,129,0.3); transition:all 0.2s; }
    #sf-capture-action:hover { transform:translateY(-1px); box-shadow:0 6px 16px rgba(16,185,129,0.4); }
    @keyframes sf-pulse { 0%,100%{box-shadow:0 4px 12px rgba(16,185,129,0.3);} 50%{box-shadow:0 4px 20px rgba(16,185,129,0.7);} }
    #sf-capture-panel { position:fixed; bottom:70px; right:24px; width:320px; background:#1a1a2e; border:1px solid rgba(255,255,255,0.12); border-radius:12px; box-shadow:0 20px 40px rgba(0,0,0,0.5); z-index:2147483647; overflow:hidden; }
    .sf-panel-header { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:linear-gradient(135deg,#10b981,#0d9488); color:white; font-size:12px; font-weight:600; }
    .sf-panel-header button { background:none; border:none; color:white; font-size:18px; cursor:pointer; }
    .sf-panel-body { padding:12px; }
    .sf-field { margin-bottom:8px; }
    .sf-field label { display:block; font-size:10px; color:#999; margin-bottom:3px; }
    .sf-field input,.sf-field textarea,.sf-field select { width:100%; padding:6px 8px; border:1px solid rgba(255,255,255,0.15); border-radius:5px; background:#0d0d1a; color:#eee; font-size:11px; outline:none; box-sizing:border-box; }
    .sf-field input:focus,.sf-field textarea:focus { border-color:#10b981; }
    .sf-field textarea { resize:vertical; font-family:monospace; font-size:11px; }
    #sf-save-contact { width:100%; padding:8px; background:linear-gradient(135deg,#10b981,#0d9488); color:white; border:none; border-radius:5px; font-size:11px; font-weight:600; cursor:pointer; margin-top:4px; }
    #sf-save-contact:hover { opacity:0.9; }
    #sf-save-contact:disabled { opacity:0.5; }
    #sf-panel-status { margin-top:6px; font-size:10px; text-align:center; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(container);

  // Event listeners
  document.getElementById("sf-capture-action").addEventListener("click", togglePanel);
  document.getElementById("sf-panel-close").addEventListener("click", () => {
    document.getElementById("sf-capture-panel").style.display = "none";
  });
  document.getElementById("sf-save-contact").addEventListener("click", saveContact);
}

function togglePanel() {
  const panel = document.getElementById("sf-capture-panel");
  if (panel.style.display === "none") {
    // Pre-fill profile
    const profile = extractProfileData();
    document.getElementById("sf-name").value = profile.name || "";
    document.getElementById("sf-company").value = profile.company || "";
    document.getElementById("sf-title").value = profile.title || "";

    // Combine intercepted + page-scraped emails
    const pageEmails = scrapePageEmails();
    const allEmails = [...new Set([...interceptedEmails, ...pageEmails])];
    if (allEmails.length > 0) {
      document.getElementById("sf-emails").value = allEmails.join("\n");
    }

    // Auto-detect role
    const t = (profile.title || "").toLowerCase();
    let role = "Other";
    if (t.includes("recruit") || t.includes("talent sourcer")) role = "Recruiter";
    else if (t.includes("engineering manager") || t.includes("eng manager")) role = "Engineering Manager";
    else if (t.includes("hiring manager")) role = "Hiring Manager";
    else if (t.includes("director")) role = "Director";
    else if (t.includes("vp") || t.includes("vice president")) role = "VP";
    else if (t.includes("sourcer")) role = "Talent Sourcer";
    else if (t.includes("develop") || t.includes("engineer") || t.includes("sde") || t.includes("swe")) role = "Software Developer";
    document.getElementById("sf-role").value = role;

    panel.style.display = "block";
    document.getElementById("sf-panel-status").textContent = "";
  } else {
    panel.style.display = "none";
  }
}

async function saveContact() {
  const btn = document.getElementById("sf-save-contact");
  const status = document.getElementById("sf-panel-status");
  
  const name = document.getElementById("sf-name").value.trim();
  const company = document.getElementById("sf-company").value.trim();
  const title = document.getElementById("sf-title").value.trim();
  const role = document.getElementById("sf-role").value;
  const emailsRaw = document.getElementById("sf-emails").value.trim();

  if (!name) { status.textContent = "❌ Name is required"; status.style.color = "#f87171"; return; }
  if (!emailsRaw) { status.textContent = "❌ At least one email required"; status.style.color = "#f87171"; return; }

  // Parse emails (comma, newline, or space separated)
  const emails = emailsRaw.split(/[\n,\s]+/).map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@"));
  if (emails.length === 0) { status.textContent = "❌ No valid emails found"; status.style.color = "#f87171"; return; }

  btn.disabled = true;
  btn.textContent = "Saving...";
  status.textContent = "";

  // Classify emails
  const personalDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "protonmail.com", "icloud.com", "aol.com", "live.com"];
  const classifiedEmails = emails.map((email, i) => ({
    email,
    type: personalDomains.includes(email.split("@")[1]) ? "personal" : "work",
    is_primary: i === 0,
  }));

  // Send via bridge (which has chrome.storage access and credentials)
  const requestId = "req_" + Date.now();
  
  window.postMessage({
    source: "sf-capture",
    action: "saveContact",
    requestId,
    payload: {
      name,
      company: company || "Unknown",
      title: title || null,
      role,
      notes: `LinkedIn: ${window.location.href.split("?")[0]}\nCaptured: ${new Date().toLocaleDateString()}`,
      emails: classifiedEmails,
    },
  }, "*");

  // Wait for response from bridge
  const response = await new Promise((resolve) => {
    const handler = (event) => {
      if (event.data?.source === "sf-bridge" && event.data?.requestId === requestId) {
        window.removeEventListener("message", handler);
        resolve(event.data);
      }
    };
    window.addEventListener("message", handler);
    // Timeout after 10s
    setTimeout(() => { window.removeEventListener("message", handler); resolve({ error: "Timeout" }); }, 10000);
  });

  if (response.error) {
    status.textContent = `❌ ${response.error}`;
    status.style.color = "#f87171";
    btn.textContent = "Save Contact";
    btn.disabled = false;
  } else {
    status.textContent = `✅ Saved! (${emails.length} email${emails.length > 1 ? "s" : ""})`;
    status.style.color = "#4ade80";
    btn.textContent = "Saved!";
    setTimeout(() => { btn.textContent = "Save Contact"; btn.disabled = false; }, 2000);
  }
}

// ─── Initialize ──────────────────────────────────────────────────────────────

if (window.location.pathname.startsWith("/in/")) {
  setTimeout(injectUI, 1500);

  // Handle LinkedIn SPA navigation
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      interceptedEmails = []; // Reset for new profile
      if (window.location.pathname.startsWith("/in/")) {
        const old = document.getElementById("sf-capture-btn");
        if (old) old.remove();
        setTimeout(injectUI, 1500);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
