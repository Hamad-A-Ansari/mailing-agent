/**
 * Maps raw Supabase Auth error messages to user-friendly, non-leaking copy.
 *
 * Supabase error messages are stable strings but not meant for direct
 * end-user display: some are overly technical, and others (e.g. "User
 * already registered") can leak whether an email exists in the system.
 * This helper normalizes them to safe, friendly text.
 */

const KNOWN_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Incorrect email or password. Please try again.",
  "Email not confirmed": "Please confirm your email address before signing in. Check your inbox for the confirmation link.",
  "User already registered": "If this email can be registered, you'll receive a confirmation link shortly.",
  "Password should be at least 6 characters": "Password must be at least 6 characters.",
  "Signup requires a valid password": "Please enter a valid password.",
  "Unable to validate email address: invalid format": "Please enter a valid email address.",
  "For security purposes, you can only request this after 60 seconds.": "Please wait a moment before trying again.",
  "New password should be different from the old password.": "Your new password must be different from your current password.",
  "Auth session missing!": "Your session has expired. Please sign in again.",
};

/**
 * Returns a safe, user-facing message for a Supabase auth error.
 * Falls back to a generic message for unrecognized errors to avoid
 * leaking internal details.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) return "Something went wrong. Please try again.";

  const rawMessage =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "";

  if (!rawMessage) return "Something went wrong. Please try again.";

  if (KNOWN_MESSAGES[rawMessage]) {
    return KNOWN_MESSAGES[rawMessage];
  }

  // Partial matches for messages that include dynamic content
  if (rawMessage.includes("rate limit") || rawMessage.includes("too many requests")) {
    return "Too many attempts. Please wait a moment before trying again.";
  }
  if (rawMessage.toLowerCase().includes("password")) {
    return rawMessage; // password policy messages are generally safe + useful to show
  }

  return "Something went wrong. Please try again.";
}

/**
 * Generic confirmation copy for actions where we deliberately avoid
 * confirming whether an email/account exists (sign-up, password reset).
 */
export const NEUTRAL_SIGNUP_MESSAGE =
  "If this email address is valid, you'll receive a confirmation link shortly.";

export const NEUTRAL_RESET_MESSAGE =
  "If an account exists for this email, you'll receive a password reset link shortly.";
