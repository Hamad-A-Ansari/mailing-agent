import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { getAuthUserId } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/interview";
import { InterviewCard } from "@/components/interview/interview-card";

export default async function InterviewDashboardPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/sign-in");

  const [myInterviews, availableInterviews] = await Promise.all([
    getInterviewsByUserId(userId),
    getLatestInterviews(userId),
  ]);

  return (
    <div className="space-y-8">
      {/* Hero CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-indigo-600/15 to-purple-600/10 border border-violet-500/20 p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNIC0xMCwzMCBsIDYwLC02MCBNIDAsMjAgbCAyMCwtMjAiIHN0cm9rZT0icmdiYSgxMzksMTAwLDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')] opacity-50" />
        <div className="relative flex flex-col gap-4 max-w-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            <span className="text-sm font-medium text-violet-300">AI-Powered</span>
          </div>
          <h1 className="text-3xl font-bold">
            Get{" "}
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Interview Ready
            </span>
          </h1>
          <p className="text-muted-foreground">
            Practice with AI mock interviews tailored to your target role and company.
            Get instant, detailed feedback to improve.
          </p>
          <Link
            href="/interview/new"
            className="mt-2 w-fit inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/25"
          >
            <Plus className="h-4 w-4" />
            Start an Interview
          </Link>
        </div>
      </div>

      {/* Your Interviews */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your Interviews</h2>
        {myInterviews.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {myInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={userId}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                company={interview.company}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 p-8 text-center">
            <p className="text-muted-foreground">
              You haven&apos;t created any interviews yet.
            </p>
            <Link
              href="/interview/new"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Generate your first interview
            </Link>
          </div>
        )}
      </section>

      {/* Available Interviews */}
      {availableInterviews.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Take an Interview</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {availableInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={userId}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                company={interview.company}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
