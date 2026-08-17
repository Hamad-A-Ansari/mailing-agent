import { NextRequest } from "next/server";
import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { getAuthUserId } from "@/lib/auth";

const MODEL = process.env.GROQ_EMAIL_MODEL ?? "openai/gpt-oss-120b";

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobDescription, resumeText, recipientName, company, role, tone } = await request.json();

  if (!jobDescription && !role) {
    return Response.json({ error: "Provide at least a job description or role" }, { status: 400 });
  }

  try {
    const { text } = await generateText({
      model: groq(MODEL),
      system: `You are an expert cold email writer for job seekers. Write concise, professional cold outreach emails that get replies. 
Rules:
- Keep it under 150 words
- Be specific about why you're a fit (reference the job/company)
- Include a clear call-to-action
- Use the tone specified
- Use {{name}} for recipient name, {{company}} for company name (these are template variables)
- Do NOT include a subject line — only the email body
- Do NOT include "Dear" or formal salutations — start with "Hi {{name}},"
- End with a simple sign-off like "Best," or "Cheers," followed by the sender's name placeholder {{sender_name}}`,
      prompt: `Generate a cold outreach email with these details:

${recipientName ? `Recipient: ${recipientName}` : ""}
${company ? `Company: ${company}` : ""}
${role ? `Target Role: ${role}` : ""}
${tone ? `Tone: ${tone}` : "Tone: professional but friendly"}

${jobDescription ? `Job Description:\n${jobDescription.substring(0, 2000)}` : ""}

${resumeText ? `My Background (from resume):\n${resumeText.substring(0, 2000)}` : ""}

Write the email body only. Use template variables {{name}}, {{company}} where appropriate.`,
    });

    return Response.json({ email: text.trim() });
  } catch (error) {
    console.error("Email generation error:", error);
    return Response.json({ error: "Failed to generate email" }, { status: 500 });
  }
}
