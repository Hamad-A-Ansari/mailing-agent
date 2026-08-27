"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  FileText,
  Mail,
  Send,
  Activity,
  Type,
  Paperclip,
  Search,
  Columns3,
  Link2,
  Settings,
  CalendarClock,
  Database,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Public HR DB", href: "/public-hr", icon: Database },
  { label: "Templates", href: "/templates", icon: FileText },
  { label: "Subject Lines", href: "/subject-lines", icon: Type },
  { label: "Resumes", href: "/resumes", icon: Paperclip },
  { label: "Send", href: "/send", icon: Mail },
  { label: "Sent", href: "/sent", icon: Send },
  { label: "Replies", href: "/replies", icon: Inbox },
  { label: "Job Search", href: "/jobs", icon: Search },
  { label: "LinkedIn Jobs", href: "/linkedin-jobs", icon: Link2 },
  { label: "Applications", href: "/applications", icon: Columns3 },
  { label: "Activity", href: "/activity", icon: Activity },
  { label: "Follow-ups", href: "/follow-ups", icon: CalendarClock },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [unreadReplies, setUnreadReplies] = useState(0);

  useEffect(() => {
    // Fetch unread reply count for badge
    fetch("/api/replies?filter=replies&unread=true&limit=1")
      .then((r) => r.json())
      .then((data) => {
        if (data.unreadCount !== undefined) setUnreadReplies(data.unreadCount);
      })
      .catch(() => {});

    // Poll every 60s
    const interval = setInterval(() => {
      fetch("/api/replies?filter=replies&unread=true&limit=1")
        .then((r) => r.json())
        .then((data) => {
          if (data.unreadCount !== undefined) setUnreadReplies(data.unreadCount);
        })
        .catch(() => {});
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-gradient-to-b from-background to-background/95">
      {/* Brand */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold">
          <Image src="/logo.svg" alt="Logo" width={28} height={24} className="h-6 w-auto" />
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-bold">
            Switch FAANG
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-emerald-500/12 to-teal-500/12 text-emerald-300 border border-emerald-500/20"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-emerald-400")} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/replies" && unreadReplies > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadReplies > 99 ? "99+" : unreadReplies}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
