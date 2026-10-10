import nodemailer from "nodemailer";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { VisitorInfo } from "./visitor";

/**
 * Build an SMTP transporter for the owner from their stored config,
 * falling back to env vars. Returns null if nothing is configured.
 */
async function getOwnerTransporter(): Promise<{
  transporter: nodemailer.Transporter;
  fromEmail: string;
  toEmail: string;
} | null> {
  const ownerId = process.env.OWNER_USER_ID;
  const supabase = createServerSupabaseClient();

  if (ownerId) {
    const { data: config } = await supabase
      .from("user_smtp_config")
      .select("email, smtp_host, smtp_port, smtp_password_encrypted")
      .eq("user_id", ownerId)
      .single();

    if (config) {
      const { decrypt } = await import("@/lib/encryption");
      const password = decrypt(config.smtp_password_encrypted);
      return {
        transporter: nodemailer.createTransport({
          host: config.smtp_host,
          port: config.smtp_port,
          secure: false,
          auth: { user: config.email, pass: password },
        }),
        fromEmail: config.email,
        toEmail: process.env.TRACKING_NOTIFY_EMAIL || config.email,
      };
    }
  }

  // Fallback to env SMTP
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      transporter: nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      }),
      fromEmail: process.env.SMTP_USER,
      toEmail: process.env.TRACKING_NOTIFY_EMAIL || process.env.SMTP_USER,
    };
  }

  return null;
}

function siteLabelOf(source: string): string {
  return source === "portfolio" ? "Portfolio" : source === "landing" ? "Switch FAANG" : source;
}

function orgOf(info: VisitorInfo): string {
  return info.org || info.isp || "Unknown network";
}

function locationOf(info: VisitorInfo): string {
  return [info.city, info.region, info.country].filter(Boolean).join(", ") || "Unknown location";
}

/**
 * Subject shared by every email for one visit. Gmail threads messages that have
 * the same subject AND reference the same Message-ID, so a visit's page-load
 * email, its per-action emails, and its timeline all land in one conversation.
 */
function visitSubject(info: VisitorInfo, source: string): string {
  return `${siteLabelOf(source)} visit: ${orgOf(info)} · ${locationOf(info)}`;
}

/** Stable Message-ID for the first email of a visit; later emails reply to it. */
function visitMessageId(visitId: string): string {
  return `<visit-${visitId}@switch-faang.vercel.app>`;
}

/** "viewed-section-experience" -> "Viewed section experience" */
export function humanizeAction(action: string): string {
  const words = action.replace(/^\/+/, "").replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Unknown action";
}

/** Render a free-form event data object as label/value rows. */
function dataRows(data: Record<string, unknown> | null | undefined): Array<[string, string]> {
  if (!data) return [];
  return Object.entries(data)
    .slice(0, 30)
    .map(([key, value]) => {
      let text: string;
      if (value === null || value === undefined) text = "—";
      else if (Array.isArray(value)) text = value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
      else if (typeof value === "object") text = JSON.stringify(value);
      else text = String(value);
      return [humanizeAction(key), text.slice(0, 500)] as [string, string];
    });
}

function tableHtml(rows: Array<[string, string]>): string {
  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px;color:#666;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 12px;font-size:13px;font-weight:500;">${escapeHtml(value)}</td></tr>`
    )
    .join("");
  return `<table style="border-collapse:collapse;width:100%;border:1px solid #eee;border-radius:8px;overflow:hidden;">${htmlRows}</table>`;
}

function wrapHtml(title: string, subtitle: string, body: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;">
      <h2 style="margin:0 0 4px;font-size:18px;">${escapeHtml(title)}</h2>
      <p style="margin:0 0 16px;color:#666;font-size:13px;">${escapeHtml(subtitle)}</p>
      ${body}
      <p style="margin:16px 0 0;color:#999;font-size:11px;">Sent by Switch FAANG visitor tracking.</p>
    </div>
  `;
}

/** Threading headers: first email of a visit owns the Message-ID, the rest reply to it. */
function threadHeaders(visitId: string | undefined, isFirst: boolean) {
  if (!visitId) return {};
  const id = visitMessageId(visitId);
  return isFirst ? { messageId: id } : { inReplyTo: id, references: [id] };
}

async function send(
  message: { subject: string; text: string; html: string } & ReturnType<typeof threadHeaders>
): Promise<boolean> {
  const setup = await getOwnerTransporter();
  if (!setup) return false;
  try {
    await setup.transporter.sendMail({ from: setup.fromEmail, to: setup.toEmail, ...message });
    return true;
  } catch {
    return false;
  }
}

export interface VisitContext {
  /** visitor_logs.id — used to thread all emails of one visit. */
  visitId?: string;
  /** 1 = first time this browser visited. */
  visitNumber?: number | null;
}

/**
 * Email for a single in-page action (section viewed, project opened, link clicked...).
 * Threads under the visit's page-load email.
 */
export async function notifyEvent(
  info: VisitorInfo,
  source: string,
  event: { action: string; page?: string | null; data?: Record<string, unknown> | null; eventNumber?: number },
  visit: VisitContext = {}
): Promise<boolean> {
  const title = humanizeAction(event.action);
  const rows: Array<[string, string]> = [
    ["Action", title],
    ...dataRows(event.data),
    ["Page", event.page || info.path || "/"],
    ...(event.eventNumber ? ([["Action # in visit", String(event.eventNumber)]] as Array<[string, string]>) : []),
    ["Organization / Company", orgOf(info)],
    ["Location", locationOf(info)],
    ["Device", `${info.deviceType} · ${info.browser} · ${info.os}`],
    ["IP Address", info.ip],
    ["Time", new Date().toLocaleString("en-US", { timeZone: info.timezone || "UTC" })],
  ];

  return send({
    subject: visitSubject(info, source),
    text: rows.map(([l, v]) => `${l}: ${v}`).join("\n"),
    html: wrapHtml(title, `${orgOf(info)} — ${locationOf(info)}`, tableHtml(rows)),
    ...threadHeaders(visit.visitId, false),
  });
}

export interface TimelineEntry {
  action: string;
  page?: string | null;
  data?: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Full timeline of everything a visitor did in this visit so far.
 * Sent when they leave or hide the tab; threads under the visit's emails.
 */
export async function notifyTimeline(
  info: VisitorInfo,
  source: string,
  events: TimelineEntry[],
  visit: VisitContext & { startedAt?: string | null; summary?: Record<string, unknown> | null } = {}
): Promise<boolean> {
  const start = new Date(visit.startedAt || events[0]?.created_at || Date.now()).getTime();
  const offset = (iso: string) => {
    const s = Math.max(0, Math.round((new Date(iso).getTime() - start) / 1000));
    return `+${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const detail = (data: TimelineEntry["data"]) =>
    dataRows(data)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");

  const timelineRows = events
    .map(
      (e) =>
        `<tr><td style="padding:4px 10px;color:#666;font-size:12px;white-space:nowrap;vertical-align:top;font-family:monospace;">${offset(e.created_at)}</td><td style="padding:4px 10px;font-size:13px;"><strong>${escapeHtml(humanizeAction(e.action))}</strong>${detail(e.data) ? `<br><span style="color:#666;font-size:12px;">${escapeHtml(detail(e.data))}</span>` : ""}</td></tr>`
    )
    .join("");

  const summaryRows: Array<[string, string]> = [
    ...dataRows(visit.summary),
    ["Actions recorded", String(events.length)],
    ...(visit.visitNumber ? ([["Visit # from this browser", String(visit.visitNumber)]] as Array<[string, string]>) : []),
    ["Organization / Company", orgOf(info)],
    ["Location", locationOf(info)],
    ["Device", `${info.deviceType} · ${info.browser} · ${info.os}`],
    ["Referrer", info.referrer || "Direct / none"],
  ];

  const html = wrapHtml(
    "Visit timeline",
    `${orgOf(info)} — ${locationOf(info)}`,
    `${tableHtml(summaryRows)}
     <h3 style="margin:20px 0 8px;font-size:15px;">What they did</h3>
     <table style="border-collapse:collapse;width:100%;border:1px solid #eee;">${timelineRows || '<tr><td style="padding:8px;color:#666;font-size:13px;">No actions recorded.</td></tr>'}</table>`
  );

  const text = [
    ...summaryRows.map(([l, v]) => `${l}: ${v}`),
    "",
    "What they did:",
    ...events.map((e) => `${offset(e.created_at)}  ${humanizeAction(e.action)}${detail(e.data) ? ` (${detail(e.data)})` : ""}`),
  ].join("\n");

  return send({
    subject: visitSubject(info, source),
    text,
    html,
    ...threadHeaders(visit.visitId, false),
  });
}

/**
 * Send a visit notification email to the owner.
 * `source` labels which site the visit came from (e.g. "portfolio", "landing").
 * When `visit.visitId` is set, this email becomes the thread root for the visit.
 */
export async function notifyVisit(
  info: VisitorInfo,
  source = "landing",
  visit: VisitContext = {}
): Promise<boolean> {
  const setup = await getOwnerTransporter();
  if (!setup) return false;

  const { transporter, fromEmail, toEmail } = setup;

  const org = orgOf(info);
  const location = locationOf(info);
  const mapLink =
    info.latitude && info.longitude
      ? `https://www.google.com/maps?q=${info.latitude},${info.longitude}`
      : null;

  const siteLabel = siteLabelOf(source);
  const subject = visitSubject(info, source);

  const rows: Array<[string, string]> = [
    ["Site", siteLabel],
    ...(visit.visitNumber
      ? ([["Visit # from this browser", visit.visitNumber === 1 ? "1 (first visit)" : String(visit.visitNumber)]] as Array<[string, string]>)
      : []),
    ["Organization / Company", org],
    ["ISP", info.isp || "—"],
    ["Location", location],
    ["IP Address", info.ip],
    ["Browser", info.browser],
    ["OS", info.os],
    ["Device", info.deviceType],
    ["Page", info.path],
    ["Referrer", info.referrer || "Direct / none"],
    ["Timezone", info.timezone || "—"],
    ["Network (AS)", info.asName || "—"],
    ["Time", new Date().toLocaleString("en-US", { timeZone: info.timezone || "UTC" })],
  ];

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px;color:#666;font-size:13px;white-space:nowrap;">${label}</td><td style="padding:6px 12px;font-size:13px;font-weight:500;">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;">
      <h2 style="margin:0 0 4px;font-size:18px;">New portfolio visit</h2>
      <p style="margin:0 0 16px;color:#666;font-size:13px;">${escapeHtml(org)} — ${escapeHtml(location)}</p>
      <table style="border-collapse:collapse;width:100%;border:1px solid #eee;border-radius:8px;overflow:hidden;">
        ${htmlRows}
      </table>
      ${mapLink ? `<p style="margin:14px 0 0;"><a href="${mapLink}" style="color:#10b981;font-size:13px;">View approximate location on map →</a></p>` : ""}
      <p style="margin:16px 0 0;color:#999;font-size:11px;">Sent by Switch FAANG visitor tracking.</p>
    </div>
  `;

  const text = rows.map(([l, v]) => `${l}: ${v}`).join("\n");

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      text,
      html,
      ...threadHeaders(visit.visitId, true),
    });
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
