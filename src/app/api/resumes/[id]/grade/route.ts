import { getAuthUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * POST /api/resumes/[id]/grade
 * Grade a resume by sending PDF directly to Gemini as base64 inline data.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerSupabaseClient();

  // Get resume record
  const { data: resume, error: dbError } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .single();

  if (dbError || !resume) {
    return Response.json({ error: "Resume not found" }, { status: 404 });
  }

  // Download PDF from storage
  const { data: fileData, error: storageError } = await supabase.storage
    .from("resumes")
    .download(resume.storage_path);

  if (storageError || !fileData) {
    return Response.json({ error: "Failed to download resume" }, { status: 500 });
  }

  // Grade with Gemini — send PDF as inline base64 data
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const base64Pdf = buffer.toString("base64");

  const prompt = `You are an expert resume reviewer and ATS (Applicant Tracking System) specialist. Grade the attached resume PDF and provide detailed feedback.

Return your response as valid JSON with this exact structure (no markdown, no code blocks, just raw JSON):
{
  "score": <number 0-100>,
  "summary": "<one sentence overall assessment>",
  "sections": {
    "formatting": { "score": <0-100>, "feedback": "<specific feedback>" },
    "content": { "score": <0-100>, "feedback": "<specific feedback>" },
    "keywords": { "score": <0-100>, "feedback": "<specific feedback>" },
    "experience": { "score": <0-100>, "feedback": "<specific feedback>" },
    "atsCompatibility": { "score": <0-100>, "feedback": "<specific feedback>" }
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]
}

Scoring criteria:
- Formatting (20%): Clean layout, consistent styling, proper sections, readability
- Content (25%): Clear accomplishments, quantified results, relevant details
- Keywords (20%): Industry-relevant terms, skills mentioned, technical keywords
- Experience (20%): Relevant experience, progression, impact demonstrated
- ATS Compatibility (15%): Simple formatting, standard section headers, parseable structure`;

  try {
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Pdf,
        },
      },
    ]);

    const responseText = result.response.text();

    // Parse JSON from response (handle possible markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const gradeData = JSON.parse(jsonStr.trim());

    return Response.json({
      resumeId: id,
      filename: resume.filename,
      ...gradeData,
    });
  } catch (err) {
    console.error("[grade] Gemini error:", err);
    return Response.json({ error: "Failed to grade resume" }, { status: 500 });
  }
}
