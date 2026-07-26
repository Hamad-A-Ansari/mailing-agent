import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TemplateList } from "@/components/templates/template-list";

export default async function TemplatesPage() {
  const { userId } = await auth();

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
