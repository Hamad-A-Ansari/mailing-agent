"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Mail,
  Activity,
  Type,
  Paperclip,
  Search,
  Columns3,
  Link2,
  Settings,
  Zap,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    ownerOnly: true,
  },
  {
    label: "Contacts",
    href: "/contacts",
    icon: Users,
    ownerOnly: false,
  },
  {
    label: "Templates",
    href: "/templates",
    icon: FileText,
    ownerOnly: true,
  },
  {
    label: "Subject Lines",
    href: "/subject-lines",
    icon: Type,
    ownerOnly: true,
  },
  {
    label: "Resumes",
    href: "/resumes",
    icon: Paperclip,
    ownerOnly: true,
  },
  {
    label: "Send",
    href: "/send",
    icon: Mail,
    ownerOnly: true,
  },
  {
    label: "Job Search",
    href: "/jobs",
    icon: Search,
    ownerOnly: true,
  },
  {
    label: "LinkedIn Jobs",
    href: "/linkedin-jobs",
    icon: Link2,
    ownerOnly: true,
  },
  {
    label: "Applications",
    href: "/applications",
    icon: Columns3,
    ownerOnly: true,
  },
  {
    label: "Activity",
    href: "/activity",
    icon: Activity,
    ownerOnly: true,
  },
  {
    label: "Follow-ups",
    href: "/follow-ups",
    icon: CalendarClock,
    ownerOnly: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    ownerOnly: false,
  },
];

interface SidebarProps {
  userRole: "owner" | "viewer";
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => !item.ownerOnly || userRole === "owner"
  );

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-gradient-to-b from-background to-background/95">
      {/* Brand */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-bold">
            Switch FAANG
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
        {visibleItems.map((item) => {
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
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
