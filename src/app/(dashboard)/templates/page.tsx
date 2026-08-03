import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import { TemplateList } from "@/components/templates/template-list";

export default async function TemplatesPage() {
  const userId = await getAuthUserId();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Templates</h1>
        <p className="text-muted-foreground">
          Manage email templates with variable support for personalized outreach.
        </p>
      </div>
      <TemplateList />
    </div>
  );
}
