import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getAuthUserId } from "@/lib/auth";
import { Agent } from "@/components/interview/agent";
import { QuickGenerateForm } from "@/components/interview/quick-generate-form";

interface PageProps {
  searchParams: Promise<{ company?: string; role?: string }>;
}

export default async function NewInterviewPage({ searchParams }: PageProps) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/sign-in");

  const params = await searchParams;
  const company = params.company || "";
  const role = params.role || "";
  const userName = "Candidate";

  // If company+role are pre-filled (from kanban), show quick form instead of voice
  const hasPrefilledData = !!(company && role);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-medium text-violet-300">
            {hasPrefilledData ? "Quick Generate" : "AI-Powered Generation"}
          </span>
        </div>
        <h1 className="text-2xl font-bold">
          Generate{" "}
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Interview
          </span>
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {hasPrefilledData
            ? "Fill in your details below and we'll generate a tailored interview instantly."
            : "Tell the AI your target role, company, and tech stack — it'll create a tailored interview with questions just for you."}
        </p>
      </div>

      {hasPrefilledData ? (
        <QuickGenerateForm
          company={company}
          role={role}
          userId={userId}
        />
      ) : (
        <Agent userName={userName} userId={userId} type="generate" />
      )}
    </div>
  );
}
