import Link from "next/link";
import { format } from "date-fns";
import { Calendar, Star } from "lucide-react";
import { DisplayTechIcons } from "./display-tech-icons";
import { getFeedbackByInterviewId } from "@/lib/actions/interview";
import type { InterviewCardProps } from "@/types/interview";

/**
 * Returns the avatar URL for an interview card.
 * - If company is provided: Google Favicon (same pattern as Application kanban cards)
 * - Fallback: UI Avatars based on role name
 */
function getInterviewAvatar(company: string | null | undefined, role: string): string {
  if (company) {
    const domain = company.toLowerCase().replace(/\s+/g, "") + ".com";
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  }
  const name = encodeURIComponent(role);
  return `https://ui-avatars.com/api/?name=${name}&background=random&color=fff&size=64&bold=true`;
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
    <div className="relative flex w-full max-w-[370px] flex-col justify-between rounded-lg border bg-card p-5 min-h-[360px]">
      {/* Type badge */}
      <div className="absolute top-3 right-3">
        <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium capitalize">
          {normalizedType}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {/* Avatar + Title */}
        <div className="flex items-center gap-3">
          <img
            src={getInterviewAvatar(company, role)}
            alt={company || role}
            className="h-12 w-12 rounded-full bg-muted object-cover"
          />
          <div>
            <h3 className="text-lg font-semibold capitalize">{role} Interview</h3>
            {company && (
              <p className="text-sm text-muted-foreground">{company}</p>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4" />
            <span>{feedback?.totalScore ?? "---"}/100</span>
          </div>
        </div>

        {/* Assessment preview */}
        <p className="text-sm text-muted-foreground line-clamp-2">
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
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {feedback ? "Check Feedback" : "Take Interview"}
        </Link>
      </div>
    </div>
  );
}
