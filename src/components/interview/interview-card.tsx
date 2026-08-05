import Link from "next/link";
import { format } from "date-fns";
import { Calendar, Star } from "lucide-react";
import { DisplayTechIcons } from "./display-tech-icons";
import { getFeedbackByInterviewId } from "@/lib/actions/interview";
import type { InterviewCardProps } from "@/types/interview";

function getInterviewAvatar(company: string | null | undefined, role: string): string {
  if (company) {
    const domain = company.toLowerCase().replace(/\s+/g, "") + ".com";
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  }
  const name = encodeURIComponent(role);
  return `https://ui-avatars.com/api/?name=${name}&background=7c3aed&color=fff&size=64&bold=true`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export async function InterviewCard({
  interviewId,
  userId,
  role,
  type,
  company,
  techstack,
  createdAt,
}: InterviewCardProps) {
  const feedback =
    userId && interviewId
      ? await getFeedbackByInterviewId(interviewId, userId)
      : null;

  const normalizedType = /mix/gi.test(type) ? "Mixed" : type;
  const formattedDate = format(
    new Date(feedback?.createdAt || createdAt || Date.now()),
    "MMM d, yyyy"
  );

  return (
    <div className="group relative flex w-full flex-col justify-between rounded-xl border border-border/50 bg-card p-5 min-h-[340px] hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300">
      {/* Gradient accent top */}
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Type badge */}
      <div className="absolute top-4 right-4">
        <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 text-xs font-medium text-violet-300 capitalize">
          {normalizedType}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {/* Avatar + Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 overflow-hidden">
            <img
              src={getInterviewAvatar(company, role)}
              alt={company || role}
              className="h-8 w-8 rounded-lg object-cover"
            />
          </div>
          <div>
            <h3 className="text-base font-semibold capitalize">{role} Interview</h3>
            {company && (
              <p className="text-xs text-violet-300/80">{company}</p>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            <span className={`text-xs font-semibold ${feedback ? getScoreColor(feedback.totalScore) : "text-muted-foreground"}`}>
              {feedback?.totalScore ?? "---"}/100
            </span>
          </div>
        </div>

        {/* Assessment preview */}
        <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
          {feedback?.finalAssessment ||
            "You haven't taken this interview yet. Take it now to improve your skills."}
        </p>
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between">
        <DisplayTechIcons techStack={techstack} />
        <Link
          href={
            feedback
              ? `/interview/${interviewId}/feedback`
              : `/interview/${interviewId}`
          }
          className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-medium text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-sm"
        >
          {feedback ? "View Feedback" : "Take Interview"}
        </Link>
      </div>
    </div>
  );
}
