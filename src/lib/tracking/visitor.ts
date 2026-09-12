/**
 * Visitor tracking helpers: extract IP, parse user-agent, enrich with geo/ISP.
 * No external npm dependencies — uses a free IP geolocation API and manual UA parsing.
 */

export interface VisitorInfo {
  ip: string;
  path: string;
  referrer: string;
  userAgent: string;
  browser: string;
  os: string;
  deviceType: string;
  isBot: boolean;
  // Geo (filled by enrichGeo)
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  org?: string;
  asName?: string;
}

/**
 * Extract the real client IP from request headers (Vercel/proxy-aware).
 */
export function getClientIp(headers: Headers): string {
  // Vercel sets x-forwarded-for; the first entry is the client
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Detect common bots/crawlers by user-agent.
 */
export function isBotUA(ua: string): boolean {
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /crawl/i,
    /slurp/i, /mediapartners/i, /facebookexternalhit/i,
    /whatsapp/i, /telegrambot/i, /discordbot/i,
    /googlebot/i, /bingbot/i, /yandex/i, /duckduckbot/i,
    /baiduspider/i, /semrush/i, /ahrefs/i, /python-requests/i,
    /axios/i, /curl/i, /wget/i, /headless/i, /lighthouse/i,
    /vercel/i, /uptime/i, /pingdom/i,
  ];
  return botPatterns.some((p) => p.test(ua));
}

/**
 * Parse browser name from user-agent.
 */
function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return "Safari";
  if (/msie|trident/i.test(ua)) return "Internet Explorer";
  return "Unknown";
}

/**
 * Parse OS from user-agent.
 */
function parseOS(ua: string): string {
  if (/windows nt 10/i.test(ua)) return "Windows 10/11";
  if (/windows nt/i.test(ua)) return "Windows";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  if (/cros/i.test(ua)) return "ChromeOS";
  return "Unknown";
}

/**
 * Parse device type from user-agent.
 */
function parseDeviceType(ua: string): string {
  if (isBotUA(ua)) return "bot";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobile|iphone|android.*mobile/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * Build a VisitorInfo from request headers + client-provided path/referrer.
 */
export function parseVisitor(
  headers: Headers,
  path: string,
  referrer: string
): VisitorInfo {
  const userAgent = headers.get("user-agent") || "";
  const ip = getClientIp(headers);

  return {
    ip,
    path: path || "/",
    referrer: referrer || headers.get("referer") || "",
    userAgent,
    browser: parseBrowser(userAgent),
    os: parseOS(userAgent),
    deviceType: parseDeviceType(userAgent),
    isBot: isBotUA(userAgent),
  };
}

/**
 * Enrich a visitor with geo + ISP/org data via ip-api.com (free, no key).
 * Returns the org/company name which is the key signal (e.g. "Microsoft Corporation").
 * Falls back gracefully if the lookup fails.
 */
export async function enrichGeo(info: VisitorInfo): Promise<VisitorInfo> {
  // Skip private/local/unknown IPs
  if (
    !info.ip ||
    info.ip === "unknown" ||
    info.ip.startsWith("127.") ||
    info.ip.startsWith("10.") ||
    info.ip.startsWith("192.168.") ||
    info.ip.startsWith("::1") ||
    info.ip === "0.0.0.0"
  ) {
    return info;
  }

  try {
    // ip-api.com free endpoint: returns country, region, city, isp, org, as, lat/lon, timezone
    const fields = "status,country,regionName,city,timezone,lat,lon,isp,org,as,query";
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(info.ip)}?fields=${fields}`,
      { signal: AbortSignal.timeout(4000) }
    );

    if (!res.ok) return info;

    const data = await res.json();
    if (data.status !== "success") return info;

    return {
      ...info,
      country: data.country || undefined,
      region: data.regionName || undefined,
      city: data.city || undefined,
      timezone: data.timezone || undefined,
      latitude: typeof data.lat === "number" ? data.lat : undefined,
      longitude: typeof data.lon === "number" ? data.lon : undefined,
      isp: data.isp || undefined,
      org: data.org || undefined,
      asName: data.as || undefined,
    };
  } catch {
    // Lookup failed (timeout, rate limit) — return what we have
    return info;
  }
}
