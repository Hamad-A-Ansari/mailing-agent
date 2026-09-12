import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseVisitor, enrichGeo, isBotUA } from "@/lib/tracking/visitor";
import { notifyVisit } from "@/lib/tracking/notify";
import { getCurrentUserId } from "@/lib/supabase/auth-server";

/**
 * POST /api/track
 * Records a landing-page visit, enriches with geo/ISP, logs it, and emails the owner.
 * Excludes: the owner (logged-in users), bots, and self-identified visits.
 *
 * Body: { path?: string, referrer?: string, self?: boolean }
 */
export async function POST(request: Request) {
  let body: { path?: string; referrer?: string; self?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine
  }

  const userAgent = request.headers.get("user-agent") || "";

  // Skip bots outright — no log, no email
  if (isBotUA(userAgent)) {
    return Response.json({ tracked: false, reason: "bot" });
  }

  // Skip if the visitor marked themselves as owner (client sets this from localStorage)
  if (body.self === true) {
    return Response.json({ tracked: false, reason: "self" });
  }

  // Skip if a logged-in user (the owner browsing their own site while authenticated)
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      return Response.json({ tracked: false, reason: "authenticated" });
    }
  } catch {
    // not authenticated — continue
  }

  // Build + enrich visitor info
  const info = parseVisitor(request.headers, body.path || "/", body.referrer || "");
  const enriched = await enrichGeo(info);

  // Persist
  const supabase = createServerSupabaseClient();
  const { data: inserted } = await supabase
    .from("visitor_logs")
    .insert({
      ip: enriched.ip,
      path: enriched.path,
      referrer: enriched.referrer,
      user_agent: enriched.userAgent,
      browser: enriched.browser,
      os: enriched.os,
      device_type: enriched.deviceType,
      country: enriched.country || null,
      region: enriched.region || null,
      city: enriched.city || null,
      timezone: enriched.timezone || null,
      latitude: enriched.latitude ?? null,
      longitude: enriched.longitude ?? null,
      isp: enriched.isp || null,
      org: enriched.org || null,
      as_name: enriched.asName || null,
      is_bot: enriched.isBot,
      emailed: false,
    })
    .select("id")
    .single();

  // Email the owner (per your setting: every visit)
  const emailed = await notifyVisit(enriched);

  if (emailed && inserted) {
    await supabase.from("visitor_logs").update({ emailed: true }).eq("id", inserted.id);
  }

  return Response.json({ tracked: true, emailed });
}
