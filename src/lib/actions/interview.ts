"use server";

import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { feedbackSchema } from "@/constants/interview";
import type {
  Interview,
  InterviewFeedback,
  CreateFeedbackParams,
} from "@/types/interview";

const FEEDBACK_MODEL = process.env.GROQ_FEEDBACK_MODEL ?? "openai/gpt-oss-120b";

// ---------- Row → Domain mappers ----------

interface InterviewRow {
  id: string;
  role: string;
  level: string;
  type: string;
  company: string | null;
  techstack: string[];
  questions: string[];
  finalized: boolean;
  user_id: string;
  created_at: string;
}

interface FeedbackRow {
  id: string;
  interview_id: string;
  user_id: string;
  total_score: number;
  category_scores: InterviewFeedback["categoryScores"];
  strengths: string[];
  areas_for_improvement: string[];
  final_assessment: string;
  created_at: string;
}

function mapInterview(row: InterviewRow): Interview {
  return {
    id: row.id,
    role: row.role,
    level: row.level,
    type: row.type,
    company: row.company,
    techstack: row.techstack,
    questions: row.questions,
    finalized: row.finalized,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

function mapFeedback(row: FeedbackRow): InterviewFeedback {
  return {
    id: row.id,
    interviewId: row.interview_id,
    totalScore: row.total_score,
    categoryScores: row.category_scores,
    strengths: row.strengths,
    areasForImprovement: row.areas_for_improvement,
    finalAssessment: row.final_assessment,
    createdAt: row.created_at,
  };
}

// ---------- CRUD ----------

export async function getInterviewById(id: string): Promise<Interview | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapInterview(data as InterviewRow);
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[]> {
  if (!userId) return [];
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as InterviewRow[]).map(mapInterview);
}

export async function getLatestInterviews(
  userId: string,
  limit = 20
): Promise<Interview[]> {
  if (!userId) return [];
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("finalized", true)
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as InterviewRow[]).map(mapInterview);
}

export async function createInterview(params: {
  userId: string;
  role: string;
  type: string;
  level: string;
  company?: string;
  techstack: string[];
  questions: string[];
}): Promise<{ success: boolean; id?: string }> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("interviews")
    .insert({
      user_id: params.userId,
      role: params.role,
      type: params.type,
      level: params.level,
      company: params.company || null,
      techstack: params.techstack,
      questions: params.questions,
      finalized: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating interview:", error);
    return { success: false };
  }

  return { success: true, id: data.id };
}

// ---------- Feedback ----------

export async function getFeedbackByInterviewId(
  interviewId: string,
  userId: string
): Promise<InterviewFeedback | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("interview_feedback")
    .select("*")
    .eq("interview_id", interviewId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapFeedback(data as FeedbackRow);
}

export async function createFeedback(
  params: CreateFeedbackParams
): Promise<{ success: boolean; feedbackId?: string }> {
  const { interviewId, userId, transcript } = params;
  const supabase = createServerSupabaseClient();

  try {
    const formattedTranscript = transcript
      .map((sentence) => `- ${sentence.role}: ${sentence.content}\n`)
      .join("");

    const { object } = await generateText({
      model: groq(FEEDBACK_MODEL),
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.

        Respond ONLY with a valid JSON object in this exact format (no markdown, no code fences, no extra text):
        {
          "totalScore": <number 0-100>,
          "categoryScores": [
            {"name": "Communication Skills", "score": <number 0-100>, "comment": "<string>"},
            {"name": "Technical Knowledge", "score": <number 0-100>, "comment": "<string>"},
            {"name": "Problem Solving", "score": <number 0-100>, "comment": "<string>"},
            {"name": "Cultural Fit", "score": <number 0-100>, "comment": "<string>"},
            {"name": "Confidence and Clarity", "score": <number 0-100>, "comment": "<string>"}
          ],
          "strengths": ["<string>", "<string>", ...],
          "areasForImprovement": ["<string>", "<string>", ...],
          "finalAssessment": "<string>"
        }
      `,
      system:
        "You are a professional interviewer analyzing a mock interview. Always respond with valid JSON only. No markdown formatting.",
    }).then((result) => {
      // Parse the JSON from the text response
      let text = result.text.trim();
      // Strip markdown code fences if present
      if (text.startsWith("```")) {
        text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }
      const parsed = JSON.parse(text);
      const validated = feedbackSchema.parse(parsed);
      return { object: validated };
    });

    const { data, error } = await supabase
      .from("interview_feedback")
      .upsert(
        {
          interview_id: interviewId,
          user_id: userId,
          total_score: object.totalScore,
          category_scores: object.categoryScores,
          strengths: object.strengths,
          areas_for_improvement: object.areasForImprovement,
          final_assessment: object.finalAssessment,
        },
        { onConflict: "interview_id,user_id" }
      )
      .select("id")
      .single();

    if (error) throw error;

    return { success: true, feedbackId: data.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}
