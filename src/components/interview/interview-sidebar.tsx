"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Mic,
  PlayCircle,
  MessageSquare,
  Code2,
  ArrowLeft,
  History,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const interviewNavItems = [
  {
    label: "Dashboard",
    href: "/interview",
    icon: LayoutDashboard,
  },
  {
    label: "Generate Interview",
    href: "/interview/new",
    icon: Mic,
  },
  {
    label: "My Interviews",
    href: "/interview/history",
    icon: PlayCircle,
  },
  {
    label: "Feedback",
    href: "/interview/feedback",
    icon: MessageSquare,
  },
  {
    label: "Coding Problems",
    href: "/interview/code",
    icon: Code2,
  },
  {
    label: "Curated Lists",
    href: "/interview/code/lists",
    icon: BookOpen,
  },
  {
    label: "Topic Progress",
    href: "/interview/code/progress",
    icon: TrendingUp,
  },
  {
    label: "Submissions",
    href: "/interview/code/submissions",
    icon: History,
  },
];

export function InterviewSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-gradient-to-b from-background to-background/95">
      {/* Logo / Brand */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/interview" className="flex items-center gap-2 font-semibold">
          {/* <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
            <Mic className="h-3.5 w-3.5 text-white" />
          </div> */}
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent font-bold">
            Place Prep
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {interviewNavItems.map((item) => {
          const isActive =
            item.href === "/interview"
              ? pathname === "/interview"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-violet-500/15 to-indigo-500/15 text-violet-300 shadow-sm border border-violet-500/20"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-violet-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Back to Outreach */}
      <div className="border-t p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Outreach
        </Link>
      </div>
    </aside>
  );
}
