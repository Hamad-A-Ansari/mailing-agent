/**
 * Popup script for Switch FAANG Chrome Extension.
 * Handles both LinkedIn Jobs pages and Profile pages.
 */

const DEFAULT_API_URL = 'https://switch-faang.vercel.app';

let extractedJobs = [];
let extractedProfile = null;
let emailGuesses = [];

// Load settings
chrome.storage.sync.get(['apiUrl'], (result) => {
  const apiUrl = result.apiUrl || DEFAULT_API_URL;
  document.getElementById('api-url').value = apiUrl;
});

// Save settings
document.getElementById('save-settings').addEventListener('click', () => {
  const apiUrl = document.getElementById('api-url').value.trim() || DEFAULT_API_URL;
  chrome.storage.sync.set({ apiUrl }, () => {
    document.getElementById('save-settings').textContent = 'Saved!';
    setTimeout(() => {
      document.getElementById('save-settings').textContent = 'Save Settings';
    }, 1500);
  });
});

// Check current page type
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const url = tab?.url || '';

  if (url.includes('linkedin.com/jobs')) {
    // Jobs page mode
    showJobsMode(tab);
  } else if (url.includes('linkedin.com/in/')) {
    // Profile page mode
    showProfileMode(tab);
  } else {
    document.getElementById('not-linkedin').style.display = 'block';
    document.getElementById('jobs-mode').style.display = 'none';
    document.getElementById('profile-mode').style.display = 'none';
  }
});

function showJobsMode(tab) {
  document.getElementById('not-linkedin').style.display = 'none';
  document.getElementById('jobs-mode').style.display = 'block';
  document.getElementById('profile-mode').style.display = 'none';

  chrome.tabs.sendMessage(tab.id, { action: 'extractJobs' }, (response) => {
    if (chrome.runtime.lastError) {
      document.getElementById('job-count').textContent = '0';
      document.getElementById('jobs-result').style.display = 'block';
      document.getElementById('jobs-result').textContent = 'Could not read page. Try refreshing LinkedIn.';
      return;
    }

    extractedJobs = response?.jobs || [];
    document.getElementById('job-count').textContent = extractedJobs.length;

    if (extractedJobs.length > 0) {
      document.getElementById('save-jobs-btn').disabled = false;
    }
  });
}

function showProfileMode(tab) {
  document.getElementById('not-linkedin').style.display = 'none';
  document.getElementById('jobs-mode').style.display = 'none';
  document.getElementById('profile-mode').style.display = 'block';

  chrome.tabs.sendMessage(tab.id, { action: 'extractProfile' }, (response) => {
    if (chrome.runtime.lastError) {
      document.getElementById('profile-info').innerHTML = '<p style="color:#f87171;">Could not read profile. Try refreshing the page.</p>';
      return;
    }

    extractedProfile = response?.profile || null;
    emailGuesses = response?.guesses || [];

    if (!extractedProfile || !extractedProfile.name) {
      document.getElementById('profile-info').innerHTML = '<p style="color:#888;">Could not extract profile data.</p>';
      return;
    }

    let html = `
      <div class="profile-card">
        <p class="profile-name">${extractedProfile.name}</p>
        <p class="profile-detail">${extractedProfile.title || 'No title'}</p>
        <p class="profile-detail">${extractedProfile.company || 'No company'}</p>
        ${extractedProfile.location ? `<p class="profile-detail">📍 ${extractedProfile.location}</p>` : ''}
      </div>
    `;

    if (extractedProfile.emails.length > 0) {
      html += `<div class="email-section"><p class="section-label">Found emails:</p>`;
      extractedProfile.emails.forEach((email) => {
        html += `<p class="email-found">✓ ${email}</p>`;
      });
      html += `</div>`;
    }

    if (emailGuesses.length > 0) {
      html += `<div class="email-section"><p class="section-label">Email guesses (unverified):</p>`;
      emailGuesses.slice(0, 4).forEach((email) => {
        html += `<p class="email-guess">? ${email}</p>`;
      });
      html += `</div>`;
    }

    document.getElementById('profile-info').innerHTML = html;
    document.getElementById('save-contact-btn').disabled = false;
  });
}

// Save Jobs button
document.getElementById('save-jobs-btn').addEventListener('click', async () => {
  const btn = document.getElementById('save-jobs-btn');
  const resultEl = document.getElementById('jobs-result');

  btn.disabled = true;
  btn.textContent = 'Saving...';
  resultEl.style.display = 'none';

  const apiUrl = document.getElementById('api-url').value.trim() || DEFAULT_API_URL;

  try {
    const response = await fetch(`${apiUrl}/api/applications/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ jobs: extractedJobs }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <span style="color: #4ade80;">✓ ${data.imported} imported</span>
      ${data.skipped > 0 ? `<span style="color: #888;"> · ${data.skipped} already existed</span>` : ''}
    `;

    btn.textContent = 'Done!';
    setTimeout(() => { btn.textContent = 'Save to Switch FAANG'; btn.disabled = false; }, 2000);
  } catch (err) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `<span style="color: #f87171;">Error: ${err.message}</span>`;
    btn.textContent = 'Save to Switch FAANG';
    btn.disabled = false;
  }
});

// Save Contact button
document.getElementById('save-contact-btn').addEventListener('click', async () => {
  const btn = document.getElementById('save-contact-btn');
  const resultEl = document.getElementById('profile-result');

  btn.disabled = true;
  btn.textContent = 'Saving...';
  resultEl.style.display = 'none';

  const apiUrl = document.getElementById('api-url').value.trim() || DEFAULT_API_URL;

  // Build contact data
  const emails = [];

  // Add found emails as primary
  if (extractedProfile.emails.length > 0) {
    extractedProfile.emails.forEach((email, i) => {
      emails.push({ email, type: 'work', is_primary: i === 0 });
    });
  } else if (emailGuesses.length > 0) {
    // Use first guess as primary (unverified)
    emails.push({ email: emailGuesses[0], type: 'work', is_primary: true });
  }

  if (emails.length === 0) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = '<span style="color: #f87171;">No email found or guessed</span>';
    btn.textContent = 'Save Contact';
    btn.disabled = false;
    return;
  }

  const contactData = {
    name: extractedProfile.name,
    company: extractedProfile.company || 'Unknown',
    title: extractedProfile.title || null,
    role: 'Recruiter',
    notes: `LinkedIn: ${extractedProfile.linkedin_url}`,
    emails: emails,
  };

  try {
    const response = await fetch(`${apiUrl}/api/recruiters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(contactData),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    resultEl.style.display = 'block';
    resultEl.innerHTML = `<span style="color: #4ade80;">✓ Contact saved to Switch FAANG</span>`;

    btn.textContent = 'Saved!';
    setTimeout(() => { btn.textContent = 'Save Contact'; btn.disabled = false; }, 2000);
  } catch (err) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `<span style="color: #f87171;">Error: ${err.message}</span>`;
    btn.textContent = 'Save Contact';
    btn.disabled = false;
  }
});
