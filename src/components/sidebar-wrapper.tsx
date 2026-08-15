"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { InterviewSidebar } from "@/components/interview/interview-sidebar";

export function SidebarWrapper() {
  const pathname = usePathname();
  const isInterviewMode = pathname.startsWith("/interview");

  if (isInterviewMode) {
    return <InterviewSidebar />;
  }

  return <Sidebar />;
}
