/**
 * Content script: Email Tool Capture
 * 
 * Detects when SignalHire, ContactOut, Lusha, RocketReach, or similar email
 * finder tools reveal contact data on LinkedIn profiles. Injects a floating
 * "Save to Switch FAANG" button that captures the profile + revealed emails
 * and pushes to the app's API.
 */

const APP_URL = "https://switch-faang.vercel.app";

// ─── Selectors for popular email finder tools ─────────────────────────────────

const EMAIL_TOOL_SELECTORS = {
  // SignalHire
  signalhire: [
    '.sh-popup-content a[href^="mailto:"]',
    '.sh-email-item',
    '[class*="signalhire"] a[href^="mailto:"]',
    'div[class*="sh-"] a[href^="mailto:"]',
  ],
  // ContactOut
  contactout: [
    '.contactout-popup a[href^="mailto:"]',
    '[class*="contactout"] a[href^="mailto:"]',
    '.co-popup a[href^="mailto:"]',
    'div[id*="contactout"] a[href^="mailto:"]',
  ],
  // Lusha
  lusha: [
    '[class*="lusha"] a[href^="mailto:"]',
    '.lusha-extension a[href^="mailto:"]',
  ],
  // RocketReach
  rocketreach: [
    '[class*="rocketreach"] a[href^="mailto:"]',
    '.rr-extension a[href^="mailto:"]',
  ],
  // Generic: any mailto links injected by extensions (not part of LinkedIn's own DOM)
  generic: [
    'a[href^="mailto:"]:not([class*="linkedin"])',
  ],
};

// ─── Profile extraction (reuses logic from content-profile.js) ────────────────

function extractProfileData() {
  const profile = {
    name: "",
    title: "",
    company: "",
    location: "",
    linkedin_url: window.location.href.split("?")[0],
  };

  // Name
  const nameEl = document.querySelector('h1.text-heading-xlarge') ||
    document.querySelector('h1[class*="text-heading"]') ||
    document.querySelector('main h1');
  if (nameEl) profile.name = nameEl.textContent.trim();

  // Title/Headline
  const titleEl = document.querySelector('.text-body-medium[data-generated-suggestion-target]') ||
    document.querySelector('main .text-body-medium') ||
    document.querySelector('div.text-body-medium');
  if (titleEl) profile.title = titleEl.textContent.trim();

  // Company
  const companyEl = document.querySelector('button[aria-label*="Current company"] span') ||
    document.querySelector('main a[href*="/company/"] span');
  if (companyEl) {
    profile.company = companyEl.textContent.trim();
  } else if (profile.title) {
    const atMatch = profile.title.match(/(?:at|@|,)\s+([^|·•,]+)/i);
    if (atMatch) profile.company = atMatch[1].trim();
  }

  // Location
  const locEl = document.querySelector('.text-body-small.inline.t-black--light.break-words') ||
    document.querySelector('main .text-body-small[class*="break-words"]');
  if (locEl && !locEl.textContent.includes('connection')) {
    profile.location = locEl.textContent.trim();
  }

  return profile;
}

// ─── Email scraping from tool overlays ────────────────────────────────────────

function scrapeRevealedEmails() {
  const emails = new Set();

  // Try all tool selectors
  for (const [tool, selectors] of Object.entries(EMAIL_TOOL_SELECTORS)) {
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((el) => {
        let email = "";
        if (el.href && el.href.startsWith("mailto:")) {
          email = el.href.replace("mailto:", "").split("?")[0].trim();
        } else if (el.textContent && el.textContent.includes("@")) {
          email = el.textContent.trim();
        }
        if (email && email.includes("@") && !email.includes("linkedin.com")) {
          emails.add(email.toLowerCase());
        }
      });
    }
  }

  // Also scan page for any new email addresses (from extension overlays)
  const allText = document.body.innerText;
  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
  const found = allText.match(emailRegex) || [];
  found.forEach((email) => {
    if (
      !email.includes("linkedin.com") &&
      !email.includes("licdn.com") &&
      !email.includes("example.com") &&
      !email.endsWith(".png") &&
      !email.endsWith(".jpg")
    ) {
      emails.add(email.toLowerCase());
    }
  });

  return [...emails];
}

// ─── Inject floating "Save" button ───────────────────────────────────────────

function injectCaptureButton() {
  // Don't inject if already present
  if (document.getElementById("sf-capture-btn")) return;

  const btn = document.createElement("div");
  btn.id = "sf-capture-btn";
  btn.innerHTML = `
    <button id="sf-capture-action" title="Save contact to Switch FAANG">
      <svg width="16" height="14" viewBox="0 0 39 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.4565 4.74223H23.5946C23.9123 4.74223 24.2275 4.75549 24.5393 4.78145C25.2866 4.84325 26.0047 4.48205 26.3786 3.83189C27.0759 2.6196 26.2799 1.08759 24.8861 0.970196C24.46 0.934358 24.0294 0.916016 23.5943 0.916016H15.5121C7.0695 0.916016 -0.0583356 7.8229 0.000359945 16.2655C0.0291433 20.4312 1.73131 24.2001 4.46517 26.9339C7.22273 29.6915 11.0331 31.3959 15.2414 31.3959H23.5943C24.0294 31.3959 24.4603 31.3776 24.8861 31.3417C26.2799 31.2241 27.0756 29.6923 26.3786 28.4801C26.0047 27.8299 25.2866 27.4687 24.5393 27.5305C24.2275 27.5565 23.912 27.5697 23.5943 27.5697H15.2414C8.85379 27.5697 3.6756 22.2976 3.82968 15.8791C3.97924 9.64811 9.2243 4.74223 15.4565 4.74223Z" fill="white"/>
        <path d="M29.875 9.89827C29.3967 9.41798 28.8583 8.99103 28.2753 8.6287C27.8968 8.39279 27.4499 8.32308 27.0153 8.43201C26.5793 8.5415 26.2153 8.81692 25.9901 9.20803C25.8487 9.45664 25.7739 9.73601 25.7739 10.0157C25.7739 10.5891 26.068 11.1159 26.561 11.4246C28.2075 12.4527 29.1904 14.222 29.1904 16.1572C29.1904 18.0917 28.207 19.8607 26.5598 20.889C25.8002 21.3653 25.5507 22.3397 25.9918 23.1082C26.285 23.615 26.831 23.9299 27.4166 23.9299C27.7196 23.9299 28.0159 23.8458 28.2724 23.6864C30.8982 22.0587 32.4655 19.2438 32.4655 16.1572C32.4661 13.7916 31.5458 11.5691 29.875 9.89827Z" fill="#DDDFFF"/>
        <path d="M24.7344 18.4356C23.4753 18.4356 22.4546 17.4149 22.4546 16.1558C22.4546 14.8967 23.4753 13.876 24.7344 13.876C25.9935 13.876 27.0142 14.8967 27.0142 16.1558C27.0142 17.4149 25.9935 18.4356 24.7344 18.4356Z" fill="white"/>
        <path d="M38.833 16.1581C38.833 21.6346 35.947 26.4338 31.6134 29.1205C31.3021 29.3133 30.9584 29.403 30.6184 29.403C29.9538 29.403 29.3054 29.0562 28.9493 28.4399C28.4292 27.5346 28.7407 26.3951 29.6265 25.8398C32.8559 23.8238 35.0067 20.238 35.0067 16.1581C35.0067 12.0782 32.8559 8.48933 29.6265 6.47336C29.0328 6.10087 28.6956 5.46538 28.6956 4.81381C28.6956 4.49606 28.7791 4.17182 28.9493 3.87326C29.4885 2.93583 30.6988 2.62457 31.6168 3.19601C32.6183 3.8188 33.5427 4.5508 34.371 5.38213C37.1282 8.13941 38.833 11.9498 38.833 16.1581Z" fill="#DDDFFF"/>
      </svg>
      <span>Save</span>
    </button>
  `;

  // Styles
  const style = document.createElement("style");
  style.textContent = `
    #sf-capture-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #sf-capture-action {
      display: flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #10b981, #0d9488);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3), 0 2px 4px rgba(0,0,0,0.2);
      transition: all 0.2s;
    }
    #sf-capture-action:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4), 0 3px 6px rgba(0,0,0,0.3);
    }
    #sf-capture-action:active {
      transform: translateY(0);
    }
    #sf-capture-action.sf-success {
      background: linear-gradient(135deg, #22c55e, #16a34a);
    }
    #sf-capture-action.sf-error {
      background: linear-gradient(135deg, #ef4444, #dc2626);
    }
    #sf-capture-action.sf-loading {
      opacity: 0.7;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(btn);

  // Click handler
  document.getElementById("sf-capture-action").addEventListener("click", handleCapture);
}

// ─── Capture and push to API ─────────────────────────────────────────────────

async function handleCapture() {
  const btn = document.getElementById("sf-capture-action");
  btn.classList.add("sf-loading");
  btn.querySelector("span").textContent = "Saving...";

  try {
    const profile = extractProfileData();
    const emails = scrapeRevealedEmails();

    if (!profile.name) {
      throw new Error("Could not extract profile name");
    }

    if (emails.length === 0) {
      throw new Error("No emails found — reveal emails first using SignalHire/ContactOut");
    }

    // Determine role from title
    let role = "Other";
    const titleLower = (profile.title || "").toLowerCase();
    if (titleLower.includes("recruit") || titleLower.includes("talent")) role = "Recruiter";
    else if (titleLower.includes("engineering manager") || titleLower.includes("eng manager")) role = "Engineering Manager";
    else if (titleLower.includes("hiring manager")) role = "Hiring Manager";
    else if (titleLower.includes("director")) role = "Director";
    else if (titleLower.includes("vp") || titleLower.includes("vice president")) role = "VP";
    else if (titleLower.includes("sourcer")) role = "Talent Sourcer";
    else if (titleLower.includes("develop") || titleLower.includes("engineer") || titleLower.includes("sde") || titleLower.includes("swe")) role = "Software Developer";

    // Classify emails (company vs personal)
    const companyDomain = profile.company
      ? profile.company.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com"
      : "";
    
    const classifiedEmails = emails.map((email) => {
      const domain = email.split("@")[1] || "";
      const isPersonal = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "protonmail.com", "icloud.com", "aol.com"].includes(domain);
      return {
        email,
        type: isPersonal ? "personal" : "company",
      };
    });

    // Get stored API key/session from extension storage
    const storage = await chrome.storage.local.get(["apiUrl"]);
    const apiUrl = storage.apiUrl || APP_URL;

    // Push to API
    const res = await fetch(`${apiUrl}/api/recruiters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: profile.name,
        company: profile.company || "Unknown",
        title: profile.title || "",
        role: role,
        notes: `LinkedIn: ${profile.linkedin_url}\nCaptured via email tool on ${new Date().toLocaleDateString()}`,
        emails: classifiedEmails,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `API error: ${res.status}`);
    }

    // Success
    btn.classList.remove("sf-loading");
    btn.classList.add("sf-success");
    btn.querySelector("span").textContent = `Saved! (${emails.length} email${emails.length > 1 ? "s" : ""})`;

    setTimeout(() => {
      btn.classList.remove("sf-success");
      btn.querySelector("span").textContent = "Save";
    }, 3000);
  } catch (err) {
    btn.classList.remove("sf-loading");
    btn.classList.add("sf-error");
    btn.querySelector("span").textContent = err.message || "Error";

    setTimeout(() => {
      btn.classList.remove("sf-error");
      btn.querySelector("span").textContent = "Save";
    }, 4000);
  }
}

// ─── Initialize ──────────────────────────────────────────────────────────────

// Inject the button when on a LinkedIn profile page
if (window.location.pathname.startsWith("/in/")) {
  // Wait a moment for the page to fully render
  setTimeout(injectCaptureButton, 2000);
  
  // Also re-inject if navigating between profiles (LinkedIn SPA)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      if (window.location.pathname.startsWith("/in/")) {
        // Remove old button and re-inject
        const old = document.getElementById("sf-capture-btn");
        if (old) old.remove();
        setTimeout(injectCaptureButton, 2000);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
