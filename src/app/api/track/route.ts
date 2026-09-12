import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseVisitor, enrichGeo, isBotUA } from "@/lib/tracking/visitor";
import { notifyVisit } from "@/lib/tracking/notify";
import { getCurrentUserId } from "@/lib/supabase/auth-server";

/**
 * Allowed origins that may POST to this tracking endpoint cross-site.
 * Includes the portfolio site (frontend-only, no backend of its own).
 * Set TRACK_ALLOWED_ORIGINS as a comma-separated env var to extend without a redeploy.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://switch-faang.vercel.app",
  "https://hamadansari.vercel.app",
];

function getAllowedOrigins(): string[] {
  const fromEnv = process.env.TRACK_ALLOWED_ORIGINS;
  if (fromEnv) {
    return fromEnv.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

/**
 * Build CORS headers. Echoes the request origin only if it's in the allowlist.
 */
function corsHeaders(origin: string | null): HeadersInit {
  const allowed = getAllowedOrigins();
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/**
 * OPTIONS /api/track — CORS preflight for cross-origin beacons.
 */
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

/**
 * POST /api/track
 * Records a visit, enriches with geo/ISP, logs it, and emails the owner.
 * Called by both the switch-faang landing page AND the portfolio site (cross-origin).
 * Excludes: the owner (logged-in users), bots, and self-identified visits.
 *
 * Body: { path?: string, referrer?: string, self?: boolean, source?: string }
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);

  let body: { path?: string; referrer?: string; self?: boolean; source?: string } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine
  }

  const userAgent = request.headers.get("user-agent") || "";

  // Skip bots outright — no log, no email
  if (isBotUA(userAgent)) {
    return Response.json({ tracked: false, reason: "bot" }, { headers: cors });
  }

  // Skip if the visitor marked themselves as owner (client sets this from localStorage)
  if (body.self === true) {
    return Response.json({ tracked: false, reason: "self" }, { headers: cors });
  }

  // Skip if a logged-in switch-faang user (owner browsing while authenticated).
  // On cross-origin portfolio calls there's no session cookie, so this passes through.
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      return Response.json({ tracked: false, reason: "authenticated" }, { headers: cors });
    }
  } catch {
    // not authenticated — continue
  }

  // Normalize source label (defaults to landing page)
  const source = (body.source || "landing").slice(0, 40);

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
      source,
      emailed: false,
    })
    .select("id")
    .single();

  // Email the owner (per setting: every visit)
  const emailed = await notifyVisit(enriched, source);

  if (emailed && inserted) {
    await supabase.from("visitor_logs").update({ emailed: true }).eq("id", inserted.id);
  }

  return Response.json({ tracked: true, emailed }, { headers: cors });
}
