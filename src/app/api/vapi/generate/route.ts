import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const QUESTION_GEN_MODEL =
  process.env.GROQ_QUESTION_MODEL ?? "openai/gpt-oss-120b";

export async function GET() {
  return Response.json({ success: true, data: "Place Prep Vapi endpoint" }, { status: 200 });
}

export async function POST(request: Request) {
  const { type, role, level, techstack, amount, userid, company } = await request.json();

  try {
    const companyContext = company ? `The target company is ${company}.` : "";

    const { text: questions } = await generateText({
      model: groq(QUESTION_GEN_MODEL),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        ${companyContext}
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
    `,
    });

    const supabase = createServerSupabaseClient();

    const { error } = await supabase.from("interviews").insert({
      role,
      type,
      level,
      company: company || null,
      techstack: techstack.split(",").map((t: string) => t.trim()),
      questions: JSON.parse(questions),
      user_id: userid,
      finalized: true,
    });

    if (error) throw error;

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Vapi generate error:", error);
    return Response.json({ success: false, error }, { status: 500 });
  }
}
