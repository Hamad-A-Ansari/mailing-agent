"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SidebarWrapper } from "@/components/sidebar-wrapper";

export function MobileMenuButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger button — only on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden flex h-9 w-9 items-center justify-center rounded-lg border bg-background shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 md:hidden animate-in slide-in-from-left duration-200">
            <div className="relative h-full">
              <SidebarWrapper />
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 rounded-md p-1 hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
