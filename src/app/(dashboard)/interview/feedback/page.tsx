import { getAuthUserId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getInterviewsByUserId, getFeedbackByInterviewId } from "@/lib/actions/interview";
import Link from "next/link";
import { format } from "date-fns";
import { Star, MessageSquare } from "lucide-react";

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "from-green-500/20 to-emerald-500/20 border-green-500/30";
  if (score >= 60) return "from-yellow-500/20 to-amber-500/20 border-yellow-500/30";
  if (score >= 40) return "from-orange-500/20 to-amber-500/20 border-orange-500/30";
  return "from-red-500/20 to-rose-500/20 border-red-500/30";
}

export default async function FeedbackListPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/sign-in");

  const interviews = await getInterviewsByUserId(userId);

  // Fetch feedback for each interview
  const interviewsWithFeedback = await Promise.all(
    interviews.map(async (interview) => {
      const feedback = await getFeedbackByInterviewId(interview.id, userId);
      return { interview, feedback };
    })
  );

  const feedbackItems = interviewsWithFeedback.filter((item) => item.feedback !== null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Interview Feedback</h1>
        <p className="text-muted-foreground">
          Review your performance across all interviews.
        </p>
      </div>

      {feedbackItems.length > 0 ? (
        <div className="space-y-3">
          {feedbackItems.map(({ interview, feedback }) => (
            <Link
              key={interview.id}
              href={`/interview/${interview.id}/feedback`}
              className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 hover:border-violet-500/40 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br border ${getScoreBg(feedback!.totalScore)}`}>
                  <span className={`text-lg font-bold ${getScoreColor(feedback!.totalScore)}`}>
                    {feedback!.totalScore}
                  </span>
                </div>
                <div>
                  <p className="font-medium capitalize">{interview.role} Interview</p>
                  <p className="text-xs text-muted-foreground">
                    {interview.company && `${interview.company} • `}
                    {format(new Date(feedback!.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground group-hover:text-violet-400 transition-colors">
                <span className="text-sm">View Details</span>
                <Star className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 p-12 text-center">
          <MessageSquare className="h-12 w-12 text-violet-400/50 mb-4" />
          <p className="text-muted-foreground">No feedback yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Complete an interview to receive AI-powered feedback.
          </p>
        </div>
      )}
    </div>
  );
}
