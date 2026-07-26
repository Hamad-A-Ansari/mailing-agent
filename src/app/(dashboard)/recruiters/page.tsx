import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isOwner } from "@/lib/auth";
import { RecruiterTable } from "@/components/recruiters/recruiter-table";

export default async function RecruitersPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recruiters</h1>
        <p className="text-muted-foreground">
          Manage your recruiter contacts and track outreach status.
        </p>
      </div>
      <RecruiterTable userRole="owner" isDemo={!isOwner(userId)} />
    </div>
  );
}
