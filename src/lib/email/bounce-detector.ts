import type { ParsedEmail } from "./reader";

export interface BounceResult {
  isBounce: boolean;
  bouncedEmail: string | null;
  reason: string | null;
  type: "hard" | "soft" | null; // hard = permanent, soft = temporary
}

/**
 * Known bounce sender patterns (Mail Delivery Subsystem, postmaster, etc.)
 */
const BOUNCE_SENDERS = [
  "mailer-daemon@",
  "postmaster@",
  "mail-daemon@",
  "maildelivery@",
  "noreply@google.com",
  "mailer-daemon@googlemail.com",
];

/**
 * Subject patterns indicating a bounce.
 */
const BOUNCE_SUBJECT_PATTERNS = [
  /delivery (status )?notification/i,
  /undelivered mail/i,
  /undeliverable/i,
  /mail delivery (failed|failure)/i,
  /failure notice/i,
  /returned mail/i,
  /message not delivered/i,
  /delivery has failed/i,
  /could not be delivered/i,
  /permanent failure/i,
  /address rejected/i,
];

/**
 * Body patterns that indicate a bounce and often contain the reason.
 */
const BOUNCE_BODY_PATTERNS = [
  /550[\s-].*?(user unknown|no such user|mailbox not found|recipient rejected|does not exist)/i,
  /553[\s-].*?(does not exist|not allowed)/i,
  /554[\s-].*?(delivery error|message rejected)/i,
  /452[\s-].*?(mailbox full|over quota|insufficient storage)/i,
  /421[\s-].*?(try again later|service not available|temporarily)/i,
  /the email account that you tried to reach does not exist/i,
  /address rejected/i,
  /user unknown/i,
  /no such user/i,
  /mailbox unavailable/i,
  /mailbox full/i,
  /over quota/i,
  /message size exceeds/i,
  /recipient address rejected/i,
  /host not found/i,
  /domain not found/i,
];

/**
 * Patterns indicating a hard (permanent) bounce.
 */
const HARD_BOUNCE_PATTERNS = [
  /550/,
  /553/,
  /554/,
  /user unknown/i,
  /no such user/i,
  /does not exist/i,
  /mailbox not found/i,
  /recipient rejected/i,
  /permanent failure/i,
  /address rejected/i,
  /domain not found/i,
  /host not found/i,
];

/**
 * Extract the bounced email address from the bounce message body.
 */
function extractBouncedEmail(body: string): string | null {
  // Look for email patterns after common indicators
  const patterns = [
    /(?:to|recipient|address|delivering to)[:\s]*<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i,
    /<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?\s*(?:was not|could not|cannot|failed)/i,
    /final[- ]recipient[:\s]*(?:rfc822;?\s*)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /original[- ]recipient[:\s]*(?:rfc822;?\s*)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match?.[1]) return match[1].toLowerCase();
  }

  return null;
}

/**
 * Extract bounce reason from the body.
 */
function extractBounceReason(body: string): string | null {
  for (const pattern of BOUNCE_BODY_PATTERNS) {
    const match = body.match(pattern);
    if (match) {
      // Return the matched text, cleaned up
      return match[0].slice(0, 200).trim();
    }
  }
  return null;
}

/**
 * Determine if a bounce is hard (permanent) or soft (temporary).
 */
function classifyBounce(body: string, reason: string | null): "hard" | "soft" {
  const text = `${body} ${reason || ""}`;
  for (const pattern of HARD_BOUNCE_PATTERNS) {
    if (pattern.test(text)) return "hard";
  }
  return "soft";
}

/**
 * Analyze an email to determine if it's a bounce notification.
 * Returns bounce details if detected, or isBounce: false otherwise.
 */
export function detectBounce(email: ParsedEmail): BounceResult {
  const fromLower = email.from.toLowerCase();
  const subjectLower = (email.subject || "").toLowerCase();
  const body = email.bodyPreview || "";

  // Check 1: Is the sender a known bounce sender?
  const isBounceSender = BOUNCE_SENDERS.some((s) => fromLower.includes(s));

  // Check 2: Does the subject match bounce patterns?
  const isBounceSubject = BOUNCE_SUBJECT_PATTERNS.some((p) => p.test(subjectLower));

  // Check 3: Does the body contain bounce indicators?
  const hasBounceBody = BOUNCE_BODY_PATTERNS.some((p) => p.test(body));

  // Need at least sender match + (subject or body), or subject + body
  const isBounce =
    (isBounceSender && (isBounceSubject || hasBounceBody)) ||
    (isBounceSubject && hasBounceBody);

  if (!isBounce) {
    return { isBounce: false, bouncedEmail: null, reason: null, type: null };
  }

  const bouncedEmail = extractBouncedEmail(body);
  const reason = extractBounceReason(body);
  const type = classifyBounce(body, reason);

  return { isBounce: true, bouncedEmail, reason, type };
}

/**
 * Check if an email is an auto-reply (out of office, vacation, etc.)
 * These are NOT bounces but also not real human replies.
 */
export function isAutoReply(email: ParsedEmail): boolean {
  const subject = (email.subject || "").toLowerCase();
  const body = (email.bodyPreview || "").toLowerCase();

  const autoReplySubjects = [
    /out of (the )?office/i,
    /automatic reply/i,
    /auto[- ]?reply/i,
    /vacation/i,
    /away from/i,
    /on leave/i,
    /\[auto\]/i,
  ];

  return autoReplySubjects.some((p) => p.test(subject) || p.test(body));
}
