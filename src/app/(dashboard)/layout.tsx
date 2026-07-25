import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserRole, isOwner } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { UserButton } from "@clerk/nextjs";
import { headers } from "next/headers";

// Routes restricted to owner only
const ownerOnlyPaths = ["/templates", "/subject-lines", "/send", "/activity"];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const userRole = getUserRole(userId);

  // Redirect non-owners from restricted routes
  if (!isOwner(userId)) {
    const headerList = await headers();
    const pathname = headerList.get("x-pathname") || headerList.get("x-invoke-path") || "";
    if (ownerOnlyPaths.some((p) => pathname.startsWith(p)) || pathname === "/") {
      redirect("/recruiters");
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={userRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-end border-b px-6">
          <UserButton />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
