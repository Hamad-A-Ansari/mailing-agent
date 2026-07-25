import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth";

export default async function RecruitersPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const userRole = getUserRole(userId);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recruiters</h1>
        {userRole === "owner" && (
          <div className="flex gap-2">
            {/* Owner-only action buttons will go here */}
            <span className="text-sm text-muted-foreground">
              [Add, Bulk Upload, Export — owner only]
            </span>
          </div>
        )}
      </div>
      <p className="mt-2 text-muted-foreground">
        {userRole === "viewer"
          ? "You have read-only access to the recruiter list."
          : "Manage your recruiter contacts here."}
      </p>
    </div>
  );
}
