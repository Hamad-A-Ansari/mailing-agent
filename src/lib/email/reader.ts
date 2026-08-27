import { ImapFlow } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

export interface IMAPConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface ParsedEmail {
  uid: number;
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  from: string;
  to: string;
  subject: string;
  bodyPreview: string;
  bodyHtml: string | null;
  date: Date;
}

/**
 * Get IMAP credentials for a user.
 * Uses user_smtp_config (same credentials work for IMAP with Gmail app passwords).
 * Falls back to env vars.
 */
export async function getIMAPConfig(userId: string): Promise<IMAPConfig> {
  const supabase = createServerSupabaseClient();

  const { data: config } = await supabase
    .from("user_smtp_config")
    .select("email, smtp_host, smtp_password_encrypted")
    .eq("user_id", userId)
    .single();

  if (config) {
    const password = decrypt(config.smtp_password_encrypted);
    // Map SMTP host to IMAP host (smtp.gmail.com → imap.gmail.com)
    const imapHost = config.smtp_host.replace("smtp.", "imap.");

    return {
      host: imapHost,
      port: 993,
      user: config.email,
      password,
    };
  }

  // Fallback to env vars
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  return {
    host: smtpHost.replace("smtp.", "imap."),
    port: 993,
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASS || "",
  };
}

/**
 * Create an authenticated IMAP connection.
 * Caller is responsible for calling client.logout() when done.
 */
export async function createIMAPClient(config: IMAPConfig): Promise<ImapFlow> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: {
      user: config.user,
      pass: config.password,
    },
    logger: false,
  });

  await client.connect();
  return client;
}

/**
 * Fetch new messages from a folder since a given UID.
 * Returns parsed emails ordered by UID ascending.
 */
export async function fetchNewMessages(
  client: ImapFlow,
  folder: string,
  sinceUid: number,
  limit: number = 100
): Promise<ParsedEmail[]> {
  const lock = await client.getMailboxLock(folder);
  const emails: ParsedEmail[] = [];

  try {
    // Search for messages with UID greater than sinceUid
    const range = sinceUid > 0 ? `${sinceUid + 1}:*` : "1:*";

    let count = 0;
    for await (const message of client.fetch(range, {
      uid: true,
      envelope: true,
      source: true,
    })) {
      if (count >= limit) break;

      // Skip if UID is not actually greater (IMAP range can include the boundary)
      if (message.uid <= sinceUid) continue;

      try {
        if (!message.source) continue;
        const parsed = await simpleParser(message.source);
        emails.push(parseMail(message.uid, parsed));
        count++;
      } catch {
        // Skip unparseable messages
        continue;
      }
    }
  } finally {
    lock.release();
  }

  return emails.sort((a, b) => a.uid - b.uid);
}

/**
 * Search mailbox by query (from, to, subject, date range).
 */
export async function searchMessages(
  client: ImapFlow,
  folder: string,
  query: {
    from?: string;
    to?: string;
    subject?: string;
    since?: Date;
    before?: Date;
  },
  limit: number = 50
): Promise<ParsedEmail[]> {
  const lock = await client.getMailboxLock(folder);
  const emails: ParsedEmail[] = [];

  try {
    // Build IMAP search criteria
    const searchCriteria: Record<string, unknown> = {};
    if (query.from) searchCriteria.from = query.from;
    if (query.to) searchCriteria.to = query.to;
    if (query.subject) searchCriteria.subject = query.subject;
    if (query.since) searchCriteria.since = query.since;
    if (query.before) searchCriteria.before = query.before;

    const uids = await client.search(searchCriteria, { uid: true });

    if (!uids || uids.length === 0) return [];

    // Take the most recent N UIDs
    const targetUids = uids.slice(-limit);
    const uidRange = targetUids.join(",");

    for await (const message of client.fetch(uidRange, {
      uid: true,
      envelope: true,
      source: true,
    })) {
      try {
        if (!message.source) continue;
        const parsed = await simpleParser(message.source);
        emails.push(parseMail(message.uid, parsed));
      } catch {
        continue;
      }
    }
  } finally {
    lock.release();
  }

  return emails.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Fetch a single message by UID.
 */
export async function fetchMessageByUid(
  client: ImapFlow,
  folder: string,
  uid: number
): Promise<ParsedEmail | null> {
  const lock = await client.getMailboxLock(folder);

  try {
    for await (const message of client.fetch(String(uid), {
      uid: true,
      envelope: true,
      source: true,
    })) {
      if (!message.source) return null;
      const parsed = await simpleParser(message.source);
      return parseMail(message.uid, parsed);
    }
  } finally {
    lock.release();
  }

  return null;
}

/**
 * Get the highest UID in a mailbox (for initial sync state).
 */
export async function getHighestUid(
  client: ImapFlow,
  folder: string
): Promise<number> {
  const lock = await client.getMailboxLock(folder);

  try {
    const status = client.mailbox;
    if (!status || !status.exists || status.exists === 0) return 0;

    // Fetch the last message to get its UID
    for await (const message of client.fetch(`${status.exists}`, {
      uid: true,
    })) {
      return message.uid;
    }
  } finally {
    lock.release();
  }

  return 0;
}

/**
 * Parse a mailparser ParsedMail into our simplified structure.
 */
function parseMail(uid: number, parsed: ParsedMail): ParsedEmail {
  const fromAddr =
    parsed.from?.value?.[0]?.address || parsed.from?.text || "";
  const toAddr =
    parsed.to
      ? Array.isArray(parsed.to)
        ? parsed.to[0]?.value?.[0]?.address || ""
        : parsed.to.value?.[0]?.address || ""
      : "";

  // Extract references as array
  let references: string[] = [];
  if (parsed.references) {
    references = Array.isArray(parsed.references)
      ? parsed.references
      : [parsed.references];
  }

  // Body preview: plain text, first 500 chars
  const bodyPreview = (parsed.text || "").slice(0, 500);

  return {
    uid,
    messageId: parsed.messageId || null,
    inReplyTo: (parsed.inReplyTo as string) || null,
    references,
    from: fromAddr,
    to: toAddr,
    subject: parsed.subject || "(No subject)",
    bodyPreview,
    bodyHtml: parsed.html || null,
    date: parsed.date || new Date(),
  };
}
