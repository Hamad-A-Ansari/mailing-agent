import { auth } from "@clerk/nextjs/server";
import { isOwner } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { sendBulkOutreach } from "@/lib/email/sender";
import { z } from "zod";

const sendEmailsSchema = z.object({
  recruiterIds: z.array(z.string()).min(1).max(50),
  templateCategory: z.enum(["outreach", "follow-up", "referral"]),
  emailTarget: z.enum(["all", "company", "personal"]).default("all"),
});

/**
 * POST /api/send-emails
 * Send bulk emails to selected recruiters. Owner only.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId || !isOwner(userId)) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = sendEmailsSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await sendBulkOutreach(
      userId,
      parsed.data.recruiterIds,
      parsed.data.templateCategory,
      parsed.data.emailTarget
    );

    await logActivity(userId, "sent_bulk_emails", {
      totalSent: result.totalSent,
      totalFailed: result.totalFailed,
      category: parsed.data.templateCategory,
      recipientCount: parsed.data.recruiterIds.length,
    });

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
