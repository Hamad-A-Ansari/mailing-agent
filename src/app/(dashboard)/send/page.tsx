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
    <div>
      <h1 className="text-2xl font-bold">Send Emails</h1>
      <p className="mt-2 text-muted-foreground">
        Select recipients, choose a template category, and send emails.
      </p>
    </div>
  );
}
