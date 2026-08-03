import { redirect } from "next/navigation";
import { getAuthUserId, isOwner } from "@/lib/auth";
import { RecruiterTable } from "@/components/recruiters/recruiter-table";

export default async function ContactsPage() {
  const userId = await getAuthUserId();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contacts</h1>
        <p className="text-muted-foreground">
          Manage your professional network and track outreach status.
        </p>
      </div>
      <RecruiterTable userRole="owner" isDemo={!isOwner(userId)} />
    </div>
  );
}
