import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isOwner } from "@/lib/auth";

export default async function SendPage() {
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
        <h1 className="text-2xl font-bold">Send Emails</h1>
        <p className="text-muted-foreground">
          Select recipients, pick a template category, review, and send.
        </p>
      </div>
      <p className="text-muted-foreground">Send wizard will be implemented in Task 9.</p>
    </div>
  );
}
