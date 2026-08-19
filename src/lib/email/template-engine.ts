/**
 * Template variable injection and sanitization utilities.
 */

/**
 * Injects variables into a template string.
 * Unknown variables are preserved as-is (not replaced with empty string).
 */
export function injectVariables(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(
    /\$\{(\w+(?:\.\w+)*)\}/g,
    (match, key) => data[key] ?? match
  );
}

/**
 * Converts markdown-style links [text](url) to HTML anchor tags.
 * Also converts plain newlines to <br> for HTML emails.
 */
export function templateToHtml(body: string): string {
  // Convert markdown links: [display text](url) → <a href="url">display text</a>
  let html = body.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" style="color:#10b981;text-decoration:underline;">$1</a>'
  );

  // Convert plain URLs (not already in an anchor) to clickable links
  // But only URLs that aren't already inside an href=""
  html = html.replace(
    /(?<!\"|>)(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#10b981;text-decoration:underline;">$1</a>'
  );

  // Convert newlines to <br>
  html = html.replace(/\n/g, "<br>");

  // Wrap in a basic email-safe div
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#222;">${html}</div>`;
}

/**
 * Strips markdown link syntax for plain text version.
 * [display text](url) → display text (url)
 */
export function templateToPlainText(body: string): string {
  return body.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
}

/**
 * Extracts the first name (first word) from a full name.
 */
export function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/**
 * Sample data used for template/subject line previews.
 */
export const sampleData: Record<string, string> = {
  "recruiter.firstname": "John",
  "recruiter.company": "Acme Corp",
  "recruiter.title": "Senior Recruiter",
  "recruiter.email": "john@acme.com",
};

/**
 * Available template variables that users can insert.
 */
export const templateVariables = [
  { key: "recruiter.firstname", label: "First Name" },
  { key: "recruiter.company", label: "Company" },
  { key: "recruiter.title", label: "Title" },
  { key: "recruiter.email", label: "Email" },
] as const;
