/**
 * Content script for LinkedIn Profile pages.
 * Extracts contact info: name, title, company, location, and any visible emails.
 */

function extractProfile() {
  const profile = {
    name: '',
    title: '',
    company: '',
    location: '',
    linkedin_url: window.location.href.split('?')[0],
    emails: [],
    phone: null,
  };

  // ─── Strategy 1: Use document.title (always works) ───────────────────
  // LinkedIn title format: "Name - Title - Company | LinkedIn"
  const pageTitle = document.title || "";
  const titleParts = pageTitle.replace(" | LinkedIn", "").split(" - ").map(s => s.trim());
  if (titleParts.length >= 1) profile.name = titleParts[0];
  if (titleParts.length >= 2) profile.title = titleParts[1];
  if (titleParts.length >= 3) profile.company = titleParts[2];

  // ─── Strategy 2: Use meta/og tags (reliable) ────────────────────────
  const ogTitle = document.querySelector('meta[property="og:title"]')?.content || "";
  if (ogTitle && !profile.name) {
    // Format: "Name - Title | LinkedIn"
    const parts = ogTitle.replace(" | LinkedIn", "").split(" - ");
    if (parts[0]) profile.name = parts[0].trim();
    if (parts[1]) profile.title = parts[1].trim();
  }

  const ogDescription = document.querySelector('meta[property="og:description"]')?.content || "";
  if (ogDescription) {
    // Often contains company/location info
    const descParts = ogDescription.split("·").map(s => s.trim());
    if (!profile.company && descParts.length > 0) {
      // Try to find company in description
      for (const part of descParts) {
        if (part && !part.includes("connections") && !part.includes("followers") && !part.includes("experience")) {
          if (!profile.location && (part.includes(",") || part.includes("India") || part.includes("USA"))) {
            profile.location = part;
          } else if (!profile.company) {
            profile.company = part;
          }
        }
      }
    }
  }

  // ─── Strategy 3: DOM selectors (may work, may not) ──────────────────
  // Name
  if (!profile.name) {
    const nameSelectors = [
      'h1.text-heading-xlarge',
      'h1[class*="text-heading"]',
      'h1[class*="artdeco-entity-lockup__title"]',
      '.pv-text-details__left-panel h1',
      'main section h1',
      '.ph5 h1',
      'main h1',
      'h1'
    ];
    for (const sel of nameSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent?.trim() && el.textContent.trim().length < 80) {
        profile.name = el.textContent.trim();
        break;
      }
    }
  }

  // Headline/Title
  if (!profile.title) {
    const titleSelectors = [
      '.text-body-medium[data-generated-suggestion-target]',
      'main .text-body-medium',
      'main section .text-body-medium',
      '.ph5 .text-body-medium',
      '.pv-text-details__left-panel .text-body-medium',
      'div.text-body-medium',
    ];
    for (const sel of titleSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent?.trim()) {
        profile.title = el.textContent.trim();
        break;
      }
    }
  }

  // Company - try to find from the profile or extract from title
  const companySelectors = [
    'button[aria-label*="Current company"] span',
    '.pv-text-details__right-panel a[href*="company"] span',
    '.pv-text-details__right-panel span[aria-hidden="true"]',
    'a[data-field="experience_company_logo"] span',
    '.ph5 ul li button span[aria-hidden="true"]',
  ];
  for (const sel of companySelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent?.trim()) {
      profile.company = el.textContent.trim();
      break;
    }
  }

  // If no company found, try extracting from title ("... at Microsoft" or "... | Microsoft")
  if (!profile.company && profile.title) {
    const atMatch = profile.title.match(/(?:at|@|,)\s+([^|·•,]+)/i);
    if (atMatch) {
      profile.company = atMatch[1].trim();
    } else {
      // Try pipe-separated: "Engineering Leader | Microsoft | xFlipkart"
      const pipeParts = profile.title.split("|").map(s => s.trim()).filter(Boolean);
      if (pipeParts.length >= 2) {
        // Second part is usually the company
        profile.company = pipeParts[1];
      }
    }
  }

  // Also check for company icon/link near the name
  if (!profile.company) {
    const companyLink = document.querySelector('main a[href*="/company/"] span');
    if (companyLink) {
      profile.company = companyLink.textContent?.trim() || '';
    }
  }

  // ─── Extract from Experience section (current role + company) ───────────
  try {
    const experienceSection = document.querySelector('#experience')
      || document.querySelector('section[id*="experience"]')
      || document.querySelector('[data-section="experience"]');

    if (experienceSection) {
      const firstItem = experienceSection.querySelector('li');
      if (firstItem) {
        // Company: look for company link or bold text
        if (!profile.company) {
          const companyEl = firstItem.querySelector('span[class*="hoverable-link-text"]')
            || firstItem.querySelector('a[href*="/company/"] span')
            || firstItem.querySelector('[class*="subtitle"] span');
          if (companyEl) profile.company = companyEl.textContent.trim();
        }
        // Role: first bold span in the experience item
        if (!profile.title || profile.title === profile.name) {
          const roleEl = firstItem.querySelector('span[class*="t-bold"] span[aria-hidden="true"]')
            || firstItem.querySelector('span[class*="t-bold"]')
            || firstItem.querySelector('div[class*="t-bold"] span');
          if (roleEl) profile.title = roleEl.textContent.trim();
        }
      }
    }

    // Fallback: any /company/ links on the page
    if (!profile.company) {
      const companyLinks = document.querySelectorAll('a[href*="/company/"]');
      for (const link of companyLinks) {
        const text = (link.textContent || '').trim();
        if (text && text.length > 1 && text.length < 50 && !text.includes("Follow")) {
          profile.company = text;
          break;
        }
      }
    }
  } catch { /* ignore */ }

  // Location
  const locationSelectors = [
    '.text-body-small.inline.t-black--light.break-words',
    'main .text-body-small[class*="break-words"]',
    '.ph5 span.text-body-small',
    '.pv-text-details__left-panel .text-body-small',
  ];
  for (const sel of locationSelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent?.trim() && !el.textContent.includes('connection')) {
      profile.location = el.textContent.trim();
      break;
    }
  }

  // Try to get emails from "Contact Info" modal if open
  const contactInfoModal = document.querySelector('.pv-contact-info, [class*="artdeco-modal"][class*="contact-info"], section.ci-email');
  if (contactInfoModal) {
    const emailLinks = contactInfoModal.querySelectorAll('a[href^="mailto:"]');
    emailLinks.forEach((link) => {
      const email = link.href.replace('mailto:', '').trim();
      if (email && email.includes('@')) profile.emails.push(email);
    });
  }

  // Scan visible page text for any email addresses
  const pageText = document.body.innerText;
  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
  const foundEmails = pageText.match(emailRegex) || [];
  foundEmails.forEach((email) => {
    if (
      !email.includes('linkedin.com') &&
      !email.includes('licdn.com') &&
      !email.includes('example.com') &&
      !email.endsWith('.png') &&
      !email.endsWith('.jpg') &&
      !profile.emails.includes(email)
    ) {
      profile.emails.push(email);
    }
  });

  return profile;
}

/**
 * Generate email pattern guesses from name + company domain.
 */
function generateEmailGuesses(name, company) {
  if (!name || !company) return [];

  const parts = name.toLowerCase().trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts[parts.length - 1] || '';
  const firstInitial = firstName.charAt(0);

  // Guess the company domain
  const domain = company
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+(inc|ltd|limited|corp|corporation|pvt|private|llc|group|technologies|tech|solutions|consulting)$/i, '')
    .replace(/\s+/g, '')
    + '.com';

  const guesses = [];

  if (firstName && lastName) {
    guesses.push(`${firstName}.${lastName}@${domain}`);
    guesses.push(`${firstName}${lastName}@${domain}`);
    guesses.push(`${firstInitial}${lastName}@${domain}`);
    guesses.push(`${firstName}@${domain}`);
    guesses.push(`${lastName}.${firstName}@${domain}`);
    guesses.push(`${firstInitial}.${lastName}@${domain}`);
  }

  return guesses;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractProfile') {
    const profile = extractProfile();
    const guesses = generateEmailGuesses(profile.name, profile.company);
    sendResponse({ profile, guesses });
  }
  return true;
});
