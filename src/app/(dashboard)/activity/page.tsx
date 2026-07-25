import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isOwner } from "@/lib/auth";

export default async function ActivityPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!isOwner(userId)) {
    redirect("/recruiters");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <p className="text-muted-foreground">
          View all actions performed in the application.
        </p>
      </div>
      <p className="text-muted-foreground">Full activity log will be implemented in Task 11.</p>
    </div>
  );
}
