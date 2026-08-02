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

  // Name
  const nameEl = document.querySelector('h1.text-heading-xlarge, h1[class*="text-heading"], .pv-text-details__left-panel h1');
  profile.name = nameEl?.textContent?.trim() || '';

  // Headline (title)
  const headlineEl = document.querySelector('.text-body-medium[data-generated-suggestion-target], div.text-body-medium, .pv-text-details__left-panel .text-body-medium');
  profile.title = headlineEl?.textContent?.trim() || '';

  // Current company - from experience or headline
  const companyEl = document.querySelector(
    'button[aria-label*="Current company"] span, ' +
    '.pv-text-details__right-panel span[aria-hidden="true"], ' +
    'div[data-generated-suggestion-target][class*="inline"] span'
  );
  if (companyEl) {
    profile.company = companyEl.textContent?.trim() || '';
  } else {
    // Try to extract from headline (e.g., "Software Engineer at Microsoft")
    const atMatch = profile.title.match(/(?:at|@)\s+(.+?)(?:\s*[|·•]|$)/i);
    if (atMatch) {
      profile.company = atMatch[1].trim();
    }
  }

  // Location
  const locationEl = document.querySelector('.text-body-small[class*="text-color-text"], span.text-body-small.inline, .pv-text-details__left-panel .text-body-small');
  profile.location = locationEl?.textContent?.trim() || '';

  // Try to get emails from "Contact Info" section if it's already open
  const contactSection = document.querySelector('.pv-contact-info');
  if (contactSection) {
    const emailLinks = contactSection.querySelectorAll('a[href^="mailto:"]');
    emailLinks.forEach((link) => {
      const email = link.href.replace('mailto:', '').trim();
      if (email && email.includes('@')) {
        profile.emails.push(email);
      }
    });

    // Also look for email text
    const emailSections = contactSection.querySelectorAll('section');
    emailSections.forEach((section) => {
      const header = section.querySelector('header');
      if (header?.textContent?.toLowerCase().includes('email')) {
        const emailEl = section.querySelector('a, span.pv-contact-info__ci-container');
        const email = emailEl?.textContent?.trim();
        if (email && email.includes('@') && !profile.emails.includes(email)) {
          profile.emails.push(email);
        }
      }
    });
  }

  // Also check if any email is visible anywhere on the page
  const pageText = document.body.innerText;
  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
  const foundEmails = pageText.match(emailRegex) || [];
  foundEmails.forEach((email) => {
    // Filter out LinkedIn's own emails and common false positives
    if (
      !email.includes('linkedin.com') &&
      !email.includes('licdn.com') &&
      !email.includes('example.com') &&
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
