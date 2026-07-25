import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isOwner } from "@/lib/auth";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Non-owner users are redirected to /recruiters
  if (!isOwner(userId)) {
    redirect("/recruiters");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome to RecruiterReach. Stats and activity will appear here.
      </p>
    </div>
  );
}
