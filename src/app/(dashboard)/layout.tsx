import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import { SidebarWrapper } from "@/components/sidebar-wrapper";
import { SignOutButton } from "@/components/sign-out-button";
import { ModeSwitcher } from "@/components/mode-switcher";

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
      <SidebarWrapper />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <ModeSwitcher />
          <SignOutButton />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
