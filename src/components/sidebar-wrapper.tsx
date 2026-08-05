"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { InterviewSidebar } from "@/components/interview/interview-sidebar";

interface SidebarWrapperProps {
  userRole: "owner" | "viewer";
}

export function SidebarWrapper({ userRole }: SidebarWrapperProps) {
  const pathname = usePathname();
  const isInterviewMode = pathname.startsWith("/interview");

  if (isInterviewMode) {
    return <InterviewSidebar />;
  }

  return <Sidebar userRole={userRole} />;
}
