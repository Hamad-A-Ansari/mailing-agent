/**
 * Content script that runs on LinkedIn Jobs pages.
 * Extracts job listings from the current page's DOM.
 */

function extractJobs() {
  const jobs = [];
  const seen = new Set();

  // Strategy 1: Job cards in the left panel list
  const listItems = document.querySelectorAll('.scaffold-layout__list-container .jobs-search-results__list-item, .scaffold-layout__list .scaffold-layout__list-item, ul.scaffold-layout__list-container > li');
  
  listItems.forEach((item) => {
    try {
      const job = extractFromListItem(item);
      if (job && !seen.has(job.linkedin_job_id)) {
        seen.add(job.linkedin_job_id);
        jobs.push(job);
      }
    } catch (e) {}
  });

  // Strategy 2: If Strategy 1 found nothing, try broader selectors
  if (jobs.length === 0) {
    const allLinks = document.querySelectorAll('a[href*="/jobs/view/"]');
    allLinks.forEach((link) => {
      try {
        const match = link.href.match(/\/jobs\/view\/(\d+)/);
        if (!match || seen.has(match[1])) return;
        
        // Walk up to find the card container
        const card = link.closest('li') || link.closest('[class*="job-card"]') || link.parentElement?.parentElement;
        if (!card) return;

        const jobId = match[1];
        const title = link.textContent?.trim() || 
                     card.querySelector('[class*="job-card-list__title"], strong, [class*="base-search-card__title"]')?.textContent?.trim() || '';
        
        // Get company - look for subtitle elements
        const company = card.querySelector('[class*="artdeco-entity-lockup__subtitle"] span, [class*="job-card-container__primary-description"], [class*="base-search-card__subtitle"]')?.textContent?.trim() ||
                       card.querySelector('.artdeco-entity-lockup__subtitle')?.textContent?.trim() || '';
        
        // Get location
        const location = card.querySelector('[class*="artdeco-entity-lockup__caption"] span, [class*="job-card-container__metadata-item"], [class*="job-search-card__location"]')?.textContent?.trim() ||
                        card.querySelector('.artdeco-entity-lockup__caption')?.textContent?.trim() || '';

        if (title) {
          seen.add(jobId);
          jobs.push({
            linkedin_job_id: jobId,
            job_title: title.substring(0, 200),
            company: company.substring(0, 100),
            location: location.substring(0, 100) || null,
            job_url: `https://www.linkedin.com/jobs/view/${jobId}/`,
          });
        }
      } catch (e) {}
    });
  }

  // Strategy 3: Parse from currentJobId in URL + visible job details
  if (jobs.length === 0) {
    const urlMatch = window.location.href.match(/currentJobId=(\d+)/);
    if (urlMatch) {
      const jobId = urlMatch[1];
      const title = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1[class*="job"]')?.textContent?.trim() || '';
      const company = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name')?.textContent?.trim() || '';
      const location = document.querySelector('.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet')?.textContent?.trim() || '';
      
      if (title) {
        jobs.push({
          linkedin_job_id: jobId,
          job_title: title,
          company: company,
          location: location || null,
          job_url: `https://www.linkedin.com/jobs/view/${jobId}/`,
        });
      }
    }
  }

  return jobs;
}

function extractFromListItem(item) {
  // Find the job link
  const link = item.querySelector('a[href*="/jobs/view/"]');
  if (!link) return null;

  const match = link.href.match(/\/jobs\/view\/(\d+)/);
  if (!match) return null;

  const jobId = match[1];

  // Title: usually in the link itself or a strong/span inside it
  let title = '';
  const titleEl = item.querySelector('.job-card-list__title, [class*="job-card-list__title"]') ||
                  link.querySelector('strong, span[aria-hidden="true"]') ||
                  link;
  title = titleEl?.textContent?.trim() || '';
  
  // Clean up title (remove "with verification" etc)
  title = title.split('\n')[0].trim();

  // Company
  const companyEl = item.querySelector('.artdeco-entity-lockup__subtitle span, [class*="job-card-container__primary-description"], [class*="artdeco-entity-lockup__subtitle"]');
  const company = companyEl?.textContent?.trim()?.split('\n')[0]?.trim() || '';

  // Location  
  const locationEl = item.querySelector('.artdeco-entity-lockup__caption span, [class*="job-card-container__metadata-item"], [class*="artdeco-entity-lockup__caption"]');
  const location = locationEl?.textContent?.trim()?.split('\n')[0]?.trim() || '';

  if (!title) return null;

  return {
    linkedin_job_id: jobId,
    job_title: title.substring(0, 200),
    company: company.substring(0, 100),
    location: location.substring(0, 100) || null,
    job_url: `https://www.linkedin.com/jobs/view/${jobId}/`,
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJobs') {
    const jobs = extractJobs();
    sendResponse({ jobs });
  }
  return true;
});
