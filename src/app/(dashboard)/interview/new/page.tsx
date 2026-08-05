import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import { Agent } from "@/components/interview/agent";

export default async function NewInterviewPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/sign-in");

  // For the generate flow, we need the user's display name.
  // We'll pass a generic name since Supabase auth doesn't always have display_name.
  const userName = "Candidate";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Generate Interview</h1>
        <p className="text-muted-foreground">
          Tell the AI what kind of interview you&apos;d like to practice, and
          it&apos;ll generate tailored questions for you.
        </p>
      </div>

      <Agent userName={userName} userId={userId} type="generate" />
    </div>
  );
}
