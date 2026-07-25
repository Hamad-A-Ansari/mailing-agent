import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isOwner } from "@/lib/auth";

export default async function SubjectLinesPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!isOwner(userId)) {
    redirect("/recruiters");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Subject Lines</h1>
      <p className="mt-2 text-muted-foreground">
        Manage your global subject line pool for email sending.
      </p>
    </div>
  );
}
