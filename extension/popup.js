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
