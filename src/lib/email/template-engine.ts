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
