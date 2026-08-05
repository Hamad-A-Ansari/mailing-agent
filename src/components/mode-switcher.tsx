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
    <div className="flex items-center rounded-lg border bg-muted/50 p-1">
      {modes.map((mode) => {
        const isActive = mode.prefix === activeMode;
        return (
          <Link
            key={mode.label}
            href={mode.href}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
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
