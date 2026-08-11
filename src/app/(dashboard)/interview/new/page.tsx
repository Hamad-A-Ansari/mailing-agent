import { redirect } from "next/navigation";
import { Sparkles, Building2 } from "lucide-react";
import { getAuthUserId } from "@/lib/auth";
import { Agent } from "@/components/interview/agent";

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

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-medium text-violet-300">AI-Powered Generation</span>
        </div>
        <h1 className="text-2xl font-bold">
          Generate{" "}
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Interview
          </span>
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Tell the AI your target role, company, and tech stack — it&apos;ll create
          a tailored interview with questions just for you.
        </p>
      </div>

      {/* Pre-filled context from kanban */}
      {(company || role) && (
        <div className="flex items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-500/20 px-4 py-2">
            {company && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-sm font-medium text-violet-300">{company}</span>
              </div>
            )}
            {company && role && <span className="text-violet-500/50">·</span>}
            {role && (
              <span className="text-sm text-muted-foreground">{role}</span>
            )}
          </div>
        </div>
      )}

      <Agent
        userName={userName}
        userId={userId}
        type="generate"
        prefillCompany={company}
        prefillRole={role}
      />
    </div>
  );
}
