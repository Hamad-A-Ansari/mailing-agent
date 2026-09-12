"use client";

import { useEffect } from "react";

/**
 * Fires a one-time visit beacon to /api/track on mount.
 * Renders nothing. Only mounted on the public landing page.
 *
 * Owner exclusion: set localStorage "sf_owner" = "1" in your browser console
 * once (on any device you use) to stop tracking your own visits:
 *   localStorage.setItem("sf_owner", "1")
 */
export function TrackBeacon() {
  useEffect(() => {
    // Skip if this browser is flagged as the owner's
    let isSelf = false;
    try {
      isSelf = localStorage.getItem("sf_owner") === "1";
    } catch {
      // localStorage unavailable — proceed
    }

    const payload = JSON.stringify({
      path: window.location.pathname,
      referrer: document.referrer || "",
      self: isSelf,
    });

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // silent — tracking must never break the page
    });
  }, []);

  return null;
}
