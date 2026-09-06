/**
 * Popup script for Switch FAANG Chrome Extension.
 * Profile mode: always shows editable form, pre-fills from content script if possible.
 * Jobs mode: same as before.
 */

const DEFAULT_API_URL = "https://switch-faang.vercel.app";

// Load settings
chrome.storage.sync.get(["apiUrl"], (result) => {
  document.getElementById("api-url").value = result.apiUrl || DEFAULT_API_URL;
});

// Save settings
document.getElementById("save-settings").addEventListener("click", () => {
  const apiUrl = document.getElementById("api-url").value.trim() || DEFAULT_API_URL;
  chrome.storage.sync.set({ apiUrl }, () => {
    const btn = document.getElementById("save-settings");
    btn.textContent = "Saved!";
    setTimeout(() => { btn.textContent = "Save Settings"; }, 1500);
  });
});

// Check current page type
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const url = tab?.url || "";

  if (url.includes("linkedin.com/jobs")) {
    showJobsMode(tab);
  } else if (url.includes("linkedin.com/in/")) {
    showProfileMode(tab);
  } else {
    document.getElementById("not-linkedin").style.display = "block";
  }
});

// ─── Jobs Mode ───────────────────────────────────────────────────────────────

let extractedJobs = [];

function showJobsMode(tab) {
  document.getElementById("jobs-mode").style.display = "block";

  chrome.tabs.sendMessage(tab.id, { action: "extractJobs" }, (response) => {
    if (chrome.runtime.lastError) {
      document.getElementById("job-count").textContent = "0";
      return;
    }
    extractedJobs = response?.jobs || [];
    document.getElementById("job-count").textContent = extractedJobs.length;
    if (extractedJobs.length > 0) {
      document.getElementById("save-jobs-btn").disabled = false;
    }
  });
}

document.getElementById("save-jobs-btn").addEventListener("click", async () => {
  const btn = document.getElementById("save-jobs-btn");
  const resultEl = document.getElementById("jobs-result");
  btn.disabled = true;
  btn.textContent = "Saving...";

  const apiUrl = document.getElementById("api-url").value.trim() || DEFAULT_API_URL;

  try {
    const res = await fetch(`${apiUrl}/api/applications/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ jobs: extractedJobs }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    const data = await res.json();
    resultEl.style.display = "block";
    resultEl.innerHTML = `<span style="color:#4ade80;">✓ ${data.imported} imported</span>`;
    btn.textContent = "Done!";
    setTimeout(() => { btn.textContent = "Save to Switch FAANG"; btn.disabled = false; }, 2000);
  } catch (err) {
    resultEl.style.display = "block";
    resultEl.innerHTML = `<span style="color:#f87171;">Error: ${err.message}</span>`;
    btn.textContent = "Save to Switch FAANG";
    btn.disabled = false;
  }
});

// ─── Profile Mode ────────────────────────────────────────────────────────────

function showProfileMode(tab) {
  document.getElementById("profile-mode").style.display = "block";

  // Load DM templates from the app (independent of profile extraction)
  loadDmTemplates();

  // Try to pre-fill from content script (may fail — that's OK)
  chrome.tabs.sendMessage(tab.id, { action: "extractProfile" }, (response) => {
    if (chrome.runtime.lastError || !response?.profile) {
      // Content script couldn't extract — form stays empty for manual input
      // Still try to get emails from interceptor and page scan
      loadInterceptedEmails(tab);
      return;
    }

    const profile = response.profile;
    const guesses = response.guesses || [];

    if (profile.name) document.getElementById("contact-name").value = profile.name;
    if (profile.company) document.getElementById("contact-company").value = profile.company;
    if (profile.title) document.getElementById("contact-title").value = profile.title;

    // Pre-fill emails (found + guesses)
    const emails = [...(profile.emails || [])];
    if (emails.length === 0 && guesses.length > 0) {
      emails.push(guesses[0]);
    }
    if (emails.length > 0) {
      document.getElementById("contact-emails").value = emails.join("\n");
    }

    // Auto-detect role
    const titleLower = (profile.title || "").toLowerCase();
    let role = "Other";
    if (titleLower.includes("recruit") || titleLower.includes("talent sourcer")) role = "Recruiter";
    else if (titleLower.includes("engineering manager") || titleLower.includes("eng manager")) role = "Engineering Manager";
    else if (titleLower.includes("hiring manager")) role = "Hiring Manager";
    else if (titleLower.includes("director")) role = "Director";
    else if (titleLower.includes("vp") || titleLower.includes("vice president")) role = "VP";
    else if (titleLower.includes("sourcer")) role = "Talent Sourcer";
    else if (titleLower.includes("develop") || titleLower.includes("engineer") || titleLower.includes("sde")) role = "Software Developer";
    document.getElementById("contact-role").value = role;

    // Also load intercepted emails (might have more than what profile extraction found)
    loadInterceptedEmails(tab);
  });
}

// Load emails from interceptor storage + page scan
function loadInterceptedEmails(tab) {
  // Check chrome.storage.local for intercepted emails
  chrome.storage.local.get(["interceptedEmails"], (result) => {
    const intercepted = result.interceptedEmails || [];
    if (intercepted.length > 0) {
      mergeEmails(intercepted);
    }
  });

  // Also try page scan via bridge
  chrome.tabs.sendMessage(tab.id, { action: "getPageEmails" }, (response) => {
    if (chrome.runtime.lastError) return;
    const pageEmails = response?.emails || [];
    if (pageEmails.length > 0) {
      mergeEmails(pageEmails);
    }
  });
}

function mergeEmails(newEmails) {
  const field = document.getElementById("contact-emails");
  const existing = field.value.trim()
    ? field.value.split(/[\n,]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)
    : [];
  const merged = [...new Set([...existing, ...newEmails.map((e) => e.toLowerCase())])];
  field.value = merged.join("\n");
}

// ─── DM Templates ──────────────────────────────────────────────────────────

let dmTemplates = [];

function getProfileVars() {
  const name = document.getElementById("contact-name").value.trim();
  const company = document.getElementById("contact-company").value.trim();
  const title = document.getElementById("contact-title").value.trim();
  const role = document.getElementById("contact-role").value || "";
  const firstName = name.split(/\s+/)[0] || "";
  return { name, firstName, company, title, role };
}

// Replace {{var}} placeholders with profile values. Unknown vars left blank.
function fillTemplate(body, vars) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v !== undefined && v !== null ? String(v) : "";
  });
}

function renderDmPreview() {
  const select = document.getElementById("dm-template");
  const preview = document.getElementById("dm-preview");
  const copyBtn = document.getElementById("dm-copy-btn");
  const templateId = select.value;

  if (!templateId) {
    preview.textContent = "";
    copyBtn.disabled = true;
    return;
  }

  const template = dmTemplates.find((t) => t.id === templateId);
  if (!template) {
    preview.textContent = "";
    copyBtn.disabled = true;
    return;
  }

  const filled = fillTemplate(template.body, getProfileVars());
  preview.textContent = filled;
  copyBtn.disabled = false;
}

function populateDmDropdown() {
  const categorySel = document.getElementById("dm-category");
  const templateSel = document.getElementById("dm-template");
  const emptyMsg = document.getElementById("dm-empty");
  const category = categorySel.value;

  const filtered = category === "all"
    ? dmTemplates
    : dmTemplates.filter((t) => t.category === category);

  templateSel.innerHTML = "";

  if (filtered.length === 0) {
    templateSel.innerHTML = '<option value="">No templates</option>';
    emptyMsg.style.display = dmTemplates.length === 0 ? "block" : "none";
    document.getElementById("dm-preview").textContent = "";
    document.getElementById("dm-copy-btn").disabled = true;
    return;
  }

  emptyMsg.style.display = "none";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a template...";
  templateSel.appendChild(placeholder);

  filtered.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    templateSel.appendChild(opt);
  });

  renderDmPreview();
}

async function loadDmTemplates() {
  const apiUrl = document.getElementById("api-url").value.trim() || DEFAULT_API_URL;
  const templateSel = document.getElementById("dm-template");
  try {
    const res = await fetch(`${apiUrl}/api/dm-templates`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    dmTemplates = data.templates || [];
    populateDmDropdown();
  } catch (err) {
    templateSel.innerHTML = '<option value="">Sign in to Switch FAANG first</option>';
    document.getElementById("dm-empty").style.display = "none";
  }
}

// Wire up DM template events
document.getElementById("dm-category").addEventListener("change", populateDmDropdown);
document.getElementById("dm-template").addEventListener("change", renderDmPreview);

// Re-render preview when profile fields change (so variables update live)
["contact-name", "contact-company", "contact-title", "contact-role"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", renderDmPreview);
  if (el && el.tagName === "SELECT") el.addEventListener("change", renderDmPreview);
});

document.getElementById("dm-copy-btn").addEventListener("click", async () => {
  const preview = document.getElementById("dm-preview");
  const resultEl = document.getElementById("dm-result");
  const btn = document.getElementById("dm-copy-btn");
  const text = preview.textContent || "";
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    const original = btn.textContent;
    btn.textContent = "Copied!";
    resultEl.style.display = "block";
    resultEl.innerHTML = '<span style="color:#4ade80;">✓ Copied — paste into LinkedIn DM</span>';
    setTimeout(() => {
      btn.textContent = original;
      resultEl.style.display = "none";
    }, 2000);
  } catch {
    resultEl.style.display = "block";
    resultEl.innerHTML = '<span style="color:#f87171;">Copy failed</span>';
  }
});

// Save Contact
document.getElementById("save-contact-btn").addEventListener("click", async () => {
  const btn = document.getElementById("save-contact-btn");
  const resultEl = document.getElementById("profile-result");

  const name = document.getElementById("contact-name").value.trim();
  const company = document.getElementById("contact-company").value.trim();
  const title = document.getElementById("contact-title").value.trim();
  const role = document.getElementById("contact-role").value;
  const emailsRaw = document.getElementById("contact-emails").value.trim();

  if (!name) {
    resultEl.style.display = "block";
    resultEl.innerHTML = '<span style="color:#f87171;">Name is required</span>';
    return;
  }
  if (!emailsRaw) {
    resultEl.style.display = "block";
    resultEl.innerHTML = '<span style="color:#f87171;">At least one email is required</span>';
    return;
  }

  // Parse emails
  const emails = emailsRaw
    .split(/[\n,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));

  if (emails.length === 0) {
    resultEl.style.display = "block";
    resultEl.innerHTML = '<span style="color:#f87171;">No valid emails found</span>';
    return;
  }

  btn.disabled = true;
  btn.textContent = "Saving...";
  resultEl.style.display = "none";

  const personalDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "protonmail.com", "icloud.com", "aol.com", "live.com"];
  const classifiedEmails = emails.map((email, i) => ({
    email,
    type: personalDomains.includes(email.split("@")[1]) ? "personal" : "work",
    is_primary: i === 0,
  }));

  const apiUrl = document.getElementById("api-url").value.trim() || DEFAULT_API_URL;

  // Get LinkedIn URL from active tab
  let linkedinUrl = "";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    linkedinUrl = tab?.url?.split("?")[0] || "";
  } catch {}

  try {
    const res = await fetch(`${apiUrl}/api/recruiters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name,
        company: company || "Unknown",
        title: title || null,
        role,
        notes: linkedinUrl ? `LinkedIn: ${linkedinUrl}` : null,
        emails: classifiedEmails,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    resultEl.style.display = "block";
    resultEl.innerHTML = `<span style="color:#4ade80;">✓ Saved! (${emails.length} email${emails.length > 1 ? "s" : ""})</span>`;
    btn.textContent = "Saved!";
    setTimeout(() => { btn.textContent = "Save Contact to Switch FAANG"; btn.disabled = false; }, 2500);
  } catch (err) {
    resultEl.style.display = "block";
    resultEl.innerHTML = `<span style="color:#f87171;">Error: ${err.message}</span>`;
    btn.textContent = "Save Contact to Switch FAANG";
    btn.disabled = false;
  }
});
