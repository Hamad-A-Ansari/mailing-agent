/**
 * Popup script for Switch FAANG Chrome Extension.
 * Communicates with content script to extract jobs, then sends to API.
 */

const DEFAULT_API_URL = 'https://switch-faang.vercel.app';

let extractedJobs = [];

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

// Check if we're on LinkedIn Jobs
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const url = tab?.url || '';

  if (!url.includes('linkedin.com/jobs')) {
    document.getElementById('not-linkedin').style.display = 'block';
    document.getElementById('main').style.display = 'none';
    return;
  }

  document.getElementById('not-linkedin').style.display = 'none';
  document.getElementById('main').style.display = 'block';

  // Extract jobs from the page
  chrome.tabs.sendMessage(tab.id, { action: 'extractJobs' }, (response) => {
    if (chrome.runtime.lastError) {
      document.getElementById('job-count').textContent = '0';
      document.getElementById('result').style.display = 'block';
      document.getElementById('result').textContent = 'Could not read page. Try refreshing LinkedIn.';
      return;
    }

    extractedJobs = response?.jobs || [];
    document.getElementById('job-count').textContent = extractedJobs.length;

    if (extractedJobs.length > 0) {
      document.getElementById('save-btn').disabled = false;
    }
  });
});

// Save button
document.getElementById('save-btn').addEventListener('click', async () => {
  const btn = document.getElementById('save-btn');
  const resultEl = document.getElementById('result');

  btn.disabled = true;
  btn.textContent = 'Saving...';
  resultEl.style.display = 'none';

  const apiUrl = document.getElementById('api-url').value.trim() || DEFAULT_API_URL;

  try {
    const response = await fetch(`${apiUrl}/api/applications/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send cookies for auth
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
    setTimeout(() => {
      btn.textContent = 'Save to Switch FAANG';
      btn.disabled = false;
    }, 2000);
  } catch (err) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `<span style="color: #f87171;">Error: ${err.message}</span>`;
    btn.textContent = 'Save to Switch FAANG';
    btn.disabled = false;
  }
});
