import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import { SidebarWrapper } from "@/components/sidebar-wrapper";
import { SignOutButton } from "@/components/sign-out-button";
import { ModeSwitcher } from "@/components/mode-switcher";
import { MobileMenuButton } from "@/components/mobile-menu-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getAuthUserId();

  if (!userId) {
    redirect("/");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <SidebarWrapper />
      </div>

      {/* Mobile sidebar overlay */}
      <MobileMenuButton />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <ModeSwitcher />
          <SignOutButton />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
