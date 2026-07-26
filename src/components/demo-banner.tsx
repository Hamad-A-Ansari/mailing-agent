"use client";

import { AlertTriangle } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-center">
      <p className="text-xs font-medium text-yellow-400 flex items-center justify-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        Demo Mode — You can explore all features freely. Email sending is disabled. Data may be cleared periodically.
      </p>
    </div>
  );
}
