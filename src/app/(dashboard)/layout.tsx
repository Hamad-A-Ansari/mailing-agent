import { redirect } from "next/navigation";
import { getAuthUserId, getUserRole, isOwner } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { DemoBanner } from "@/components/demo-banner";
import { SignOutButton } from "@/components/sign-out-button";
import { ModeSwitcher } from "@/components/mode-switcher";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getAuthUserId();

  if (!userId) {
    redirect("/sign-in");
  }

  const userRole = getUserRole(userId);
  const isDemo = !isOwner(userId);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={isDemo ? "owner" : userRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {isDemo && <DemoBanner />}
        <header className="flex h-14 items-center justify-between border-b px-6">
          <ModeSwitcher />
          <SignOutButton />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
