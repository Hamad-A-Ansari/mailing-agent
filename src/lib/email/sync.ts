import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getIMAPConfig,
  createIMAPClient,
  fetchNewMessages,
  getHighestUid,
  type ParsedEmail,
} from "./reader";
import { detectBounce, isAutoReply } from "./bounce-detector";

export interface SyncResult {
  newReplies: number;
  bounces: number;
  autoReplies: number;
  totalProcessed: number;
  errors: string[];
}

/**
 * Main sync orchestrator.
 * Connects to IMAP, fetches new messages since last sync,
 * classifies them (reply, bounce, auto-reply), updates DB.
 */
export async function syncInbox(userId: string): Promise<SyncResult> {
  const supabase = createServerSupabaseClient();
  const config = await getIMAPConfig(userId);
  const result: SyncResult = {
    newReplies: 0,
    bounces: 0,
    autoReplies: 0,
    totalProcessed: 0,
    errors: [],
  };

  let client;
  try {
    client = await createIMAPClient(config);
  } catch (err) {
    result.errors.push(
      `IMAP connection failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return result;
  }

  try {
    // Get or create sync state for INBOX
    const { data: syncState } = await supabase
      .from("email_sync_state")
      .select("*")
      .eq("user_id", userId)
      .eq("folder", "INBOX")
      .single();

    const lastUid = syncState?.last_uid || 0;
    const isFirstSync = !syncState;

    // First sync: don't process the entire mailbox history (would time out).
    // Just set the baseline to the current highest UID so future runs only
    // process genuinely new mail.
    if (isFirstSync) {
      const highest = await getHighestUid(client, "INBOX");
      await upsertSyncState(supabase, userId, "INBOX", highest, 0);
      return result;
    }

    // Fetch new messages (small batch to stay within serverless time budget)
    const messages = await fetchNewMessages(client, "INBOX", lastUid, 30);

    if (messages.length === 0) {
      // Update last_synced_at even if no new messages
      await upsertSyncState(supabase, userId, "INBOX", lastUid, 0);
      return result;
    }

    // Get user's sent email addresses for matching
    const userEmail = config.user.toLowerCase();

    // Get all recruiter emails for matching replies to recruiters
    const { data: recruiterEmails } = await supabase
      .from("recruiter_emails")
      .select("email, recruiter_id")
      .eq("user_id", userId);

    const emailToRecruiter = new Map<string, string>();
    if (recruiterEmails) {
      for (const re of recruiterEmails) {
        emailToRecruiter.set(re.email.toLowerCase(), re.recruiter_id);
      }
    }

    // Also get email_logs message_ids for thread matching
    const { data: sentLogs } = await supabase
      .from("email_logs")
      .select("to_email, recruiter_id")
      .eq("user_id", userId)
      .eq("status", "sent");

    if (sentLogs) {
      for (const log of sentLogs) {
        if (log.to_email && log.recruiter_id) {
          emailToRecruiter.set(log.to_email.toLowerCase(), log.recruiter_id);
        }
      }
    }

    // Process each message
    let highestUid = lastUid;

    for (const email of messages) {
      result.totalProcessed++;
      if (email.uid > highestUid) highestUid = email.uid;

      try {
        // Skip emails we sent (they appear in INBOX as well sometimes)
        if (email.from.toLowerCase() === userEmail) continue;

        // Check for duplicates
        if (email.messageId) {
          const { data: existing } = await supabase
            .from("email_threads")
            .select("id")
            .eq("user_id", userId)
            .eq("message_id", email.messageId)
            .maybeSingle();

          if (existing) continue; // Already synced
        }

        // Classify the email
        const bounceResult = detectBounce(email);
        const autoReply = !bounceResult.isBounce && isAutoReply(email);

        // Match to a recruiter
        const recruiterId = matchRecruiter(email, emailToRecruiter);

        // Determine if it's a reply to our outreach
        const isReply = !bounceResult.isBounce && !autoReply && !!email.inReplyTo;

        // Insert into email_threads
        const { data: thread } = await supabase
          .from("email_threads")
          .insert({
            user_id: userId,
            message_id: email.messageId,
            in_reply_to: email.inReplyTo,
            thread_id: deriveThreadId(email),
            recruiter_id: recruiterId,
            direction: "received",
            from_email: email.from,
            to_email: email.to || userEmail,
            subject: email.subject,
            body_preview: email.bodyPreview,
            body_html: email.bodyHtml,
            is_reply: isReply,
            is_bounce: bounceResult.isBounce,
            bounce_reason: bounceResult.reason,
            is_read: false,
            imap_uid: email.uid,
            received_at: email.date.toISOString(),
          })
          .select("id")
          .single();

        // Update recruiter status based on classification
        if (recruiterId) {
          if (bounceResult.isBounce) {
            result.bounces++;
            await supabase
              .from("recruiters")
              .update({ outreach_status: "bounced" })
              .eq("id", recruiterId);

            // If hard bounce, mark the email as bounced
            if (bounceResult.bouncedEmail) {
              await supabase
                .from("recruiter_emails")
                .update({ is_valid: false })
                .eq("email", bounceResult.bouncedEmail);
            }
          } else if (isReply) {
            result.newReplies++;
            await supabase
              .from("recruiters")
              .update({ outreach_status: "replied" })
              .eq("id", recruiterId);

            // Create notification
            if (thread) {
              await supabase.from("reply_notifications").insert({
                user_id: userId,
                thread_id: thread.id,
                is_read: false,
              });
            }
          } else if (autoReply) {
            result.autoReplies++;
            // Don't change status for auto-replies
          }
        } else {
          // Still count for metrics even without recruiter match
          if (bounceResult.isBounce) result.bounces++;
          else if (isReply) result.newReplies++;
          else if (autoReply) result.autoReplies++;
        }
      } catch (err) {
        result.errors.push(
          `Error processing UID ${email.uid}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Update sync state with highest UID processed
    await upsertSyncState(
      supabase,
      userId,
      "INBOX",
      highestUid,
      messages.length
    );
  } finally {
    await client.logout();
  }

  return result;
}

/**
 * Sync sent folder to capture outgoing message IDs for thread matching.
 */
export async function syncSentFolder(userId: string): Promise<number> {
  const supabase = createServerSupabaseClient();
  const config = await getIMAPConfig(userId);

  let client;
  try {
    client = await createIMAPClient(config);
  } catch {
    return 0;
  }

  let synced = 0;
  const sentFolder = "[Gmail]/Sent Mail";

  try {
    const { data: syncState } = await supabase
      .from("email_sync_state")
      .select("*")
      .eq("user_id", userId)
      .eq("folder", sentFolder)
      .single();

    const lastUid = syncState?.last_uid || 0;
    const isFirstSync = !syncState;

    // First sync: baseline only, don't process the entire sent history.
    if (isFirstSync) {
      const highest = await getHighestUid(client, sentFolder);
      await upsertSyncState(supabase, userId, sentFolder, highest, 0);
      return 0;
    }

    const messages = await fetchNewMessages(client, sentFolder, lastUid, 30);

    let highestUid = lastUid;

    for (const email of messages) {
      if (email.uid > highestUid) highestUid = email.uid;

      // Skip if already exists
      if (email.messageId) {
        const { data: existing } = await supabase
          .from("email_threads")
          .select("id")
          .eq("user_id", userId)
          .eq("message_id", email.messageId)
          .maybeSingle();

        if (existing) continue;
      }

      // Match to recruiter by recipient email
      const recruiterId = matchRecruiterByTo(email.to, await getRecruiterEmailMap(supabase, userId));

      await supabase.from("email_threads").insert({
        user_id: userId,
        message_id: email.messageId,
        in_reply_to: email.inReplyTo,
        thread_id: deriveThreadId(email),
        recruiter_id: recruiterId,
        direction: "sent",
        from_email: email.from,
        to_email: email.to,
        subject: email.subject,
        body_preview: email.bodyPreview,
        body_html: email.bodyHtml,
        is_reply: false,
        is_bounce: false,
        is_read: true,
        imap_uid: email.uid,
        received_at: email.date.toISOString(),
      });

      synced++;
    }

    await upsertSyncState(supabase, userId, sentFolder, highestUid, synced);
  } finally {
    await client.logout();
  }

  return synced;
}

/**
 * Full sync: inbox + sent folder.
 */
export async function fullSync(userId: string): Promise<SyncResult & { sentSynced: number }> {
  const inboxResult = await syncInbox(userId);
  const sentSynced = await syncSentFolder(userId);
  return { ...inboxResult, sentSynced };
}

/**
 * Match an incoming email to a recruiter by their from address.
 */
function matchRecruiter(
  email: ParsedEmail,
  emailToRecruiter: Map<string, string>
): string | null {
  const fromLower = email.from.toLowerCase();
  return emailToRecruiter.get(fromLower) || null;
}

/**
 * Match by To address (for sent emails).
 */
function matchRecruiterByTo(
  to: string,
  emailToRecruiter: Map<string, string>
): string | null {
  return emailToRecruiter.get(to.toLowerCase()) || null;
}

/**
 * Derive a thread ID from message references.
 * Uses the first reference as thread root, or message-id if no references.
 */
function deriveThreadId(email: ParsedEmail): string {
  if (email.references.length > 0) {
    return email.references[0]; // Thread root is first reference
  }
  if (email.inReplyTo) {
    return email.inReplyTo;
  }
  return email.messageId || `uid-${email.uid}`;
}

/**
 * Upsert sync state for a folder.
 */
async function upsertSyncState(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string,
  folder: string,
  lastUid: number,
  newCount: number
) {
  const { data: existing } = await supabase
    .from("email_sync_state")
    .select("id, total_synced")
    .eq("user_id", userId)
    .eq("folder", folder)
    .single();

  if (existing) {
    await supabase
      .from("email_sync_state")
      .update({
        last_uid: lastUid,
        last_synced_at: new Date().toISOString(),
        total_synced: (existing.total_synced || 0) + newCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("email_sync_state").insert({
      user_id: userId,
      folder,
      last_uid: lastUid,
      last_synced_at: new Date().toISOString(),
      total_synced: newCount,
    });
  }
}

/**
 * Helper to get recruiter email map for a user.
 */
async function getRecruiterEmailMap(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("recruiter_emails")
    .select("email, recruiter_id")
    .eq("user_id", userId);

  const map = new Map<string, string>();
  if (data) {
    for (const row of data) {
      map.set(row.email.toLowerCase(), row.recruiter_id);
    }
  }
  return map;
}
