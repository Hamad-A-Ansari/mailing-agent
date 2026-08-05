import Link from "next/link";
import { Plus } from "lucide-react";
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Interview Prep</h1>
          <p className="text-muted-foreground">
            Practice mock interviews with AI and get instant feedback
          </p>
        </div>
        <Link
          href="/interview/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Interview
        </Link>
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
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              You haven&apos;t created any interviews yet.
            </p>
            <Link
              href="/interview/new"
              className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="h-3 w-3" />
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
