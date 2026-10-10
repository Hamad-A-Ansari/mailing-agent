import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseVisitor, enrichGeo, isBotUA, type VisitorInfo } from "@/lib/tracking/visitor";
import { notifyVisit, notifyEvent, notifyTimeline, type TimelineEntry } from "@/lib/tracking/notify";
import { getCurrentUserId } from "@/lib/supabase/auth-server";

/**
 * Allowed origins that may POST to this tracking endpoint cross-site.
 * Includes the portfolio site (frontend-only, no backend of its own).
 * Set TRACK_ALLOWED_ORIGINS as a comma-separated env var to override the list
 * (it replaces the defaults, so include every origin you need).
 */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://switch-faang.vercel.app",
  "https://hamadansari.vercel.app",
];

/** Stop runaway clients from flooding the table/inbox from a single session. */
const MAX_EVENTS_PER_SESSION = 500;
/** Max serialized size of an event's free-form `data` object. */
const MAX_DATA_BYTES = 4000;

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
 * Request body. Legacy clients (landing page, older portfolio builds) only send
 * path/referrer/self/source and are always treated as a page load.
 */
interface TrackBody {
  path?: string;
  referrer?: string;
  self?: boolean;
  source?: string;
  /** "pageview" (default) records a visit; "event" records an in-page action. */
  kind?: "pageview" | "event";
  /** Event name, e.g. "viewed-section-experience". */
  action?: string;
  /** window.location.pathname at the time of the action. */
  page?: string;
  /** Free-form details about the action (seconds, scroll %, project name...). */
  data?: unknown;
  /** True when the visitor hid/left the tab: email the full visit timeline. */
  summary?: boolean;
  /** Per-tab session id (sessionStorage). Groups a visit's events. */
  sessionId?: string;
  /** Per-browser id (localStorage). Links repeat visits. */
  visitorId?: string;
  /** How many sessions this browser has started, 1 = first visit. */
  visitNumber?: number;
}

type VisitRow = {
  id: string;
  created_at: string;
  ip: string | null;
  path: string | null;
  referrer: string | null;
  user_agent: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  isp: string | null;
  org: string | null;
  as_name: string | null;
  is_bot: boolean | null;
  emailed: boolean | null;
  visit_number: number | null;
};

const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

function cleanId(value: unknown): string | null {
  return typeof value === "string" && ID_PATTERN.test(value) ? value : null;
}

/** "/Viewed-Section-Experience" -> "viewed-section-experience" (safe, bounded). */
function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const action = value
    .replace(/^\/+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return action || null;
}

/** Accept only a plain JSON object under MAX_DATA_BYTES. */
function cleanData(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  try {
    const json = JSON.stringify(value);
    if (json.length > MAX_DATA_BYTES) return { truncated: true };
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function cleanVisitNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value < 100000 ? value : null;
}

function visitRowFields(info: VisitorInfo, source: string) {
  return {
    ip: info.ip,
    path: info.path,
    referrer: info.referrer,
    user_agent: info.userAgent,
    browser: info.browser,
    os: info.os,
    device_type: info.deviceType,
    country: info.country || null,
    region: info.region || null,
    city: info.city || null,
    timezone: info.timezone || null,
    latitude: info.latitude ?? null,
    longitude: info.longitude ?? null,
    isp: info.isp || null,
    org: info.org || null,
    as_name: info.asName || null,
    is_bot: info.isBot,
    source,
    emailed: false,
  };
}

function rowToVisitor(row: VisitRow): VisitorInfo {
  return {
    ip: row.ip || "unknown",
    path: row.path || "/",
    referrer: row.referrer || "",
    userAgent: row.user_agent || "",
    browser: row.browser || "Unknown",
    os: row.os || "Unknown",
    deviceType: row.device_type || "desktop",
    isBot: !!row.is_bot,
    country: row.country || undefined,
    region: row.region || undefined,
    city: row.city || undefined,
    timezone: row.timezone || undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    isp: row.isp || undefined,
    org: row.org || undefined,
    asName: row.as_name || undefined,
  };
}

type Supabase = ReturnType<typeof createServerSupabaseClient>;

/** Waits between visit lookups for an event that beat its page load (total ~5s). */
const VISIT_LOOKUP_RETRY_MS = [0, 1500, 1500, 2000];
/** A page load within this window reuses a visit row an early event already created. */
const REUSE_VISIT_WINDOW_MS = 60_000;

async function findSessionVisit(
  supabase: Supabase,
  sessionId: string
): Promise<{ visit: VisitRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from("visitor_logs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { visit: (data as VisitRow | null) ?? null, error };
}

/**
 * Insert a visitor_logs row. Includes session columns when available; if the
 * 023 migration hasn't been applied yet, retries without them so tracking keeps
 * working.
 */
async function insertVisit(
  supabase: Supabase,
  fields: ReturnType<typeof visitRowFields>,
  session: { session_id: string; visitor_id: string | null; visit_number: number | null } | null
): Promise<string | null> {
  if (session) {
    const { data, error } = await supabase
      .from("visitor_logs")
      .insert({ ...fields, ...session })
      .select("id")
      .single();
    if (!error && data) return data.id as string;
  }
  const { data } = await supabase.from("visitor_logs").insert(fields).select("id").single();
  return (data?.id as string | undefined) ?? null;
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
 *
 * kind "pageview" (default, and all legacy clients): records a visit in
 * visitor_logs, does the geo/ISP lookup, and emails the owner. With a sessionId
 * that email becomes the thread root for the visit.
 *
 * kind "event" (needs sessionId): records an in-page action in visitor_events,
 * reusing the visit's geo (no extra lookup), and emails it into the visit's
 * thread. With summary: true it emails the full visit timeline instead.
 *
 * Excludes: the owner (logged-in users), bots, and self-identified visits.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);

  let body: TrackBody = {};
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

  const source = (typeof body.source === "string" && body.source ? body.source : "landing").slice(0, 40);
  const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 500) : "";
  const sessionId = cleanId(body.sessionId);
  const visitorId = cleanId(body.visitorId);
  const visitNumber = cleanVisitNumber(body.visitNumber);
  const supabase = createServerSupabaseClient();

  // ---------------------------------------------------------------- events
  if (body.kind === "event" && sessionId) {
    const action = cleanAction(body.action ?? body.path);
    if (!action) {
      return Response.json({ tracked: false, reason: "invalid" }, { status: 400, headers: cors });
    }
    const page = typeof body.page === "string" && body.page ? body.page.slice(0, 200) : "/";
    const data = cleanData(body.data);

    // Find this session's visit (carries the geo lookup). The page-load request
    // may still be doing its geo lookup (up to ~4s), so retry briefly before
    // concluding the visit doesn't exist.
    let visit: VisitRow | null = null;
    let lookupError: unknown = null;
    for (const waitMs of VISIT_LOOKUP_RETRY_MS) {
      if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
      const result = await findSessionVisit(supabase, sessionId);
      lookupError = result.error;
      visit = result.visit;
      if (visit || lookupError) break;
    }

    if (lookupError) {
      // Session columns missing (023 migration not applied): fall back to the
      // legacy behavior of one visit row + email per action.
      const info = await enrichGeo(parseVisitor(request.headers, `/${action}`, referrer));
      const visitId = await insertVisit(supabase, visitRowFields(info, source), null);
      const emailed = await notifyVisit(info, source);
      if (emailed && visitId) await supabase.from("visitor_logs").update({ emailed: true }).eq("id", visitId);
      return Response.json({ tracked: true, emailed, mode: "legacy" }, { headers: cors });
    }

    if (!visit) {
      // Event arrived before (or without) its page load: create the visit now.
      const info = await enrichGeo(parseVisitor(request.headers, page, referrer));
      const visitId = await insertVisit(supabase, visitRowFields(info, source), {
        session_id: sessionId,
        visitor_id: visitorId,
        visit_number: visitNumber,
      });
      const { data: created } = visitId
        ? await supabase.from("visitor_logs").select("*").eq("id", visitId).maybeSingle()
        : { data: null };
      visit = (created as VisitRow | null) ?? null;
    }

    const info = visit ? rowToVisitor(visit) : parseVisitor(request.headers, page, referrer);
    const visitId = visit?.id;

    const { count: priorEvents } = await supabase
      .from("visitor_events")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);

    if ((priorEvents ?? 0) >= MAX_EVENTS_PER_SESSION) {
      return Response.json({ tracked: false, reason: "cap" }, { headers: cors });
    }

    const { data: insertedEvent } = await supabase
      .from("visitor_events")
      .insert({
        visit_id: visitId ?? null,
        session_id: sessionId,
        visitor_id: visitorId,
        source,
        action,
        page,
        data,
      })
      .select("id")
      .single();

    let emailed: boolean;
    if (body.summary === true) {
      const { data: events } = await supabase
        .from("visitor_events")
        .select("action, page, data, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(MAX_EVENTS_PER_SESSION);

      emailed = await notifyTimeline(info, source, (events as TimelineEntry[] | null) ?? [], {
        visitId,
        visitNumber: visit?.visit_number ?? visitNumber,
        startedAt: visit?.created_at,
        summary: data,
      });
    } else {
      emailed = await notifyEvent(
        info,
        source,
        { action, page, data, eventNumber: (priorEvents ?? 0) + 1 },
        { visitId }
      );
    }

    if (emailed && insertedEvent) {
      await supabase.from("visitor_events").update({ emailed: true }).eq("id", insertedEvent.id);
    }

    return Response.json({ tracked: true, emailed, kind: "event" }, { headers: cors });
  }

  // ------------------------------------------------------------- page load
  const path = typeof body.page === "string" && body.page ? body.page : body.path || "/";
  const info = parseVisitor(request.headers, path.slice(0, 200), referrer);
  const enriched = await enrichGeo(info);

  // If an early event already created this session's visit moments ago, reuse it
  // instead of logging the same visit twice.
  let visitId: string | null = null;
  if (sessionId) {
    const { visit: existing } = await findSessionVisit(supabase, sessionId);
    if (
      existing &&
      !existing.emailed &&
      Date.now() - new Date(existing.created_at).getTime() < REUSE_VISIT_WINDOW_MS
    ) {
      visitId = existing.id;
    }
  }
  if (!visitId) {
    visitId = await insertVisit(
      supabase,
      visitRowFields(enriched, source),
      sessionId ? { session_id: sessionId, visitor_id: visitorId, visit_number: visitNumber } : null
    );
  }

  // Email the owner (per setting: every visit). With a session this starts the visit's thread.
  const emailed = await notifyVisit(enriched, source, {
    visitId: sessionId ? visitId ?? undefined : undefined,
    visitNumber,
  });

  if (emailed && visitId) {
    await supabase.from("visitor_logs").update({ emailed: true }).eq("id", visitId);
  }

  return Response.json({ tracked: true, emailed }, { headers: cors });
}
