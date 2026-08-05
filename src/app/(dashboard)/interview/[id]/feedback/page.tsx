import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Star, Calendar, ArrowLeft, RotateCcw } from "lucide-react";
import { getAuthUserId } from "@/lib/auth";
import {
  getInterviewById,
  getFeedbackByInterviewId,
} from "@/lib/actions/interview";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FeedbackPage({ params }: PageProps) {
  const { id } = await params;
  const userId = await getAuthUserId();
  if (!userId) redirect("/sign-in");

  const interview = await getInterviewById(id);
  if (!interview) redirect("/interview");

  const feedback = await getFeedbackByInterviewId(id, userId);
  if (!feedback) redirect(`/interview/${id}`);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">
          Feedback —{" "}
          <span className="capitalize">{interview.role}</span> Interview
        </h1>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4 text-yellow-500" />
          <span>
            Overall:{" "}
            <span className="font-bold text-foreground">
              {feedback.totalScore}
            </span>
            /100
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(feedback.createdAt), "MMM d, yyyy h:mm a")}</span>
        </div>
      </div>

      <hr className="border-border" />

      {/* Final Assessment */}
      <p className="text-sm leading-relaxed">{feedback.finalAssessment}</p>

      {/* Category Breakdown */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Breakdown</h2>
        <div className="space-y-3">
          {feedback.categoryScores.map((category, index) => (
            <div key={index} className="rounded-lg border p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {index + 1}. {category.name}
                </p>
                <span className="text-sm font-bold">{category.score}/100</span>
              </div>
              <p className="text-sm text-muted-foreground">{category.comment}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Strengths */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-green-500">Strengths</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {feedback.strengths.map((strength, index) => (
            <li key={index}>{strength}</li>
          ))}
        </ul>
      </section>

      {/* Areas for Improvement */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-orange-500">
          Areas for Improvement
        </h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {feedback.areasForImprovement.map((area, index) => (
            <li key={index}>{area}</li>
          ))}
        </ul>
      </section>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Link
          href="/interview"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <Link
          href={`/interview/${id}`}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Retake Interview
        </Link>
      </div>
    </div>
  );
}
