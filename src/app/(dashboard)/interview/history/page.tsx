import { getAuthUserId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getInterviewsByUserId } from "@/lib/actions/interview";
import { InterviewCard } from "@/components/interview/interview-card";
import { PlayCircle } from "lucide-react";
import Link from "next/link";

export default async function InterviewHistoryPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/sign-in");

  const interviews = await getInterviewsByUserId(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Interviews</h1>
        <p className="text-muted-foreground">
          All your generated and taken interviews in one place.
        </p>
      </div>

      {interviews.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {interviews.map((interview) => (
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 p-12 text-center">
          <PlayCircle className="h-12 w-12 text-violet-400/50 mb-4" />
          <p className="text-muted-foreground">No interviews yet.</p>
          <Link
            href="/interview/new"
            className="mt-3 text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Generate your first interview →
          </Link>
        </div>
      )}
    </div>
  );
}
