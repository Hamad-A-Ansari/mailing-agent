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
    href: "/",
    icon: LayoutDashboard,
    ownerOnly: true,
  },
  {
    label: "Recruiters",
    href: "/recruiters",
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
    label: "Activity",
    href: "/activity",
    icon: Activity,
    ownerOnly: true,
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
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span>Switch FAANG</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
