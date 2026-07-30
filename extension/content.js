/**
 * Content script that runs on LinkedIn Jobs pages.
 * Extracts job listings from the current page.
 */

function extractJobs() {
  const jobs = [];

  // LinkedIn job cards in search results
  const jobCards = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item, [data-job-id]');

  jobCards.forEach((card) => {
    try {
      // Try multiple selectors for job ID
      const jobId = card.getAttribute('data-job-id') ||
        card.querySelector('[data-job-id]')?.getAttribute('data-job-id') ||
        card.querySelector('a[href*="/jobs/view/"]')?.href?.match(/\/jobs\/view\/(\d+)/)?.[1] ||
        card.querySelector('a[href*="/jobs/collections/"]')?.href?.match(/currentJobId=(\d+)/)?.[1];

      if (!jobId) return;

      // Extract title
      const titleEl = card.querySelector('.job-card-list__title, .job-card-container__link, a[class*="job-card"] strong, .artdeco-entity-lockup__title');
      const title = titleEl?.textContent?.trim() || '';

      // Extract company
      const companyEl = card.querySelector('.job-card-container__primary-description, .artdeco-entity-lockup__subtitle, [class*="job-card-container__company"]');
      const company = companyEl?.textContent?.trim() || '';

      // Extract location
      const locationEl = card.querySelector('.job-card-container__metadata-item, [class*="job-card-container__metadata"], .artdeco-entity-lockup__caption');
      const location = locationEl?.textContent?.trim() || '';

      // Build job URL
      const jobUrl = `https://www.linkedin.com/jobs/view/${jobId}/`;

      if (title && company) {
        jobs.push({
          linkedin_job_id: jobId,
          job_title: title,
          company: company,
          location: location || null,
          job_url: jobUrl,
        });
      }
    } catch (e) {
      // Skip malformed cards
    }
  });

  // Fallback: try the scaffold list (newer LinkedIn UI)
  if (jobs.length === 0) {
    const scaffoldCards = document.querySelectorAll('.scaffold-layout__list-container .jobs-search-results__list-item, .jobs-search__results-list li');
    scaffoldCards.forEach((card) => {
      try {
        const link = card.querySelector('a[href*="/jobs/view/"]');
        const jobId = link?.href?.match(/\/jobs\/view\/(\d+)/)?.[1];
        if (!jobId) return;

        const title = card.querySelector('.job-card-list__title, strong, [class*="base-search-card__title"]')?.textContent?.trim() || '';
        const company = card.querySelector('[class*="base-search-card__subtitle"], .artdeco-entity-lockup__subtitle span')?.textContent?.trim() || '';
        const location = card.querySelector('[class*="job-search-card__location"], .artdeco-entity-lockup__caption span')?.textContent?.trim() || '';

        if (title && company) {
          jobs.push({
            linkedin_job_id: jobId,
            job_title: title,
            company: company,
            location: location || null,
            job_url: `https://www.linkedin.com/jobs/view/${jobId}/`,
          });
        }
      } catch (e) {
        // Skip
      }
    });
  }

  return jobs;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJobs') {
    const jobs = extractJobs();
    sendResponse({ jobs });
  }
  return true; // Keep message channel open for async response
});
