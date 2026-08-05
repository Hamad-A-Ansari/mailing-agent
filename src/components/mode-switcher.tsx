"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Mail, Mic } from "lucide-react";

const modes = [
  { label: "Outreach", href: "/", icon: Mail, prefix: "" },
  { label: "Interview", href: "/interview", icon: Mic, prefix: "/interview" },
] as const;

export function ModeSwitcher() {
  const pathname = usePathname();
  const activeMode = pathname.startsWith("/interview") ? "/interview" : "";

  return (
    <div className="flex items-center rounded-lg border bg-muted/30 p-1 gap-0.5">
      {modes.map((mode) => {
        const isActive = mode.prefix === activeMode;
        const isInterview = mode.prefix === "/interview";
        return (
          <Link
            key={mode.label}
            href={mode.href}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              isActive && !isInterview && "bg-gradient-to-r from-emerald-600/80 to-teal-600/80 text-white shadow-sm",
              isActive && isInterview && "bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-sm",
              !isActive && "text-muted-foreground hover:text-foreground"
            )}
          >
            <mode.icon className="h-3.5 w-3.5" />
            {mode.label}
          </Link>
        );
      })}
    </div>
  );
}
