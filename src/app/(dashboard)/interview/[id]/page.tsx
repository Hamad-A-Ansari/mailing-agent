import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import { getInterviewById } from "@/lib/actions/interview";
import { Agent } from "@/components/interview/agent";
import { DisplayTechIcons } from "@/components/interview/display-tech-icons";

function getInterviewAvatar(company: string | null | undefined, role: string): string {
  if (company) {
    const domain = company.toLowerCase().replace(/\s+/g, "") + ".com";
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  }
  const name = encodeURIComponent(role);
  return `https://ui-avatars.com/api/?name=${name}&background=random&color=fff&size=40&bold=true`;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TakeInterviewPage({ params }: PageProps) {
  const { id } = await params;
  const userId = await getAuthUserId();
  if (!userId) redirect("/sign-in");

  const interview = await getInterviewById(id);
  if (!interview) redirect("/interview");

  const userName = "Candidate";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Interview header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={getInterviewAvatar(interview.company, interview.role)}
            alt={interview.company || interview.role}
            className="h-10 w-10 rounded-full bg-muted object-cover"
          />
          <div>
            <h1 className="text-xl font-semibold capitalize">
              {interview.role} Interview
            </h1>
            {interview.company && (
              <p className="text-sm text-muted-foreground">{interview.company}</p>
            )}
          </div>
          <DisplayTechIcons techStack={interview.techstack} />
        </div>
        <span className="rounded-md bg-muted px-3 py-1.5 text-sm capitalize">
          {interview.type}
        </span>
      </div>

      {/* Agent */}
      <Agent
        userName={userName}
        userId={userId}
        interviewId={id}
        type="interview"
        questions={interview.questions}
      />
    </div>
  );
}
