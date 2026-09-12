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

/**
 * Send a visit notification email to the owner.
 * `source` labels which site the visit came from (e.g. "portfolio", "landing").
 */
export async function notifyVisit(info: VisitorInfo, source = "landing"): Promise<boolean> {
  const setup = await getOwnerTransporter();
  if (!setup) return false;

  const { transporter, fromEmail, toEmail } = setup;

  const org = info.org || info.isp || "Unknown network";
  const location = [info.city, info.region, info.country].filter(Boolean).join(", ") || "Unknown location";
  const mapLink =
    info.latitude && info.longitude
      ? `https://www.google.com/maps?q=${info.latitude},${info.longitude}`
      : null;

  const siteLabel = source === "portfolio" ? "Portfolio" : source === "landing" ? "Switch FAANG" : source;
  const subject = `${siteLabel} visit: ${org} · ${location}`;

  const rows: Array<[string, string]> = [
    ["Site", siteLabel],
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
