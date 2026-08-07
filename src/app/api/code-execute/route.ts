import { NextRequest } from "next/server";
import { SUPPORTED_LANGUAGES } from "@/types/coding";
import type { SupportedLanguageId } from "@/types/coding";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/auth-server";

/**
 * Judge0 CE (Community Edition) code execution API.
 *
 * Free hosted instance: https://judge0-ce.p.rapidapi.com
 * Or self-hosted. Configure via JUDGE0_API_URL env var.
 *
 * RapidAPI key required for the hosted version.
 * Get one free at: https://rapidapi.com/judge0-official/api/judge0-ce
 */

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || "";
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || "judge0-ce.p.rapidapi.com";

function getJudge0LanguageId(language: SupportedLanguageId): number {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.id === language);
  return lang?.judge0Id ?? 71; // default to Python 3
}

// Map Judge0 status IDs to human-readable status
function mapStatus(statusId: number): string {
  const statusMap: Record<number, string> = {
    1: "In Queue",
    2: "Processing",
    3: "Accepted",
    4: "Wrong Answer",
    5: "Time Limit Exceeded",
    6: "Compilation Error",
    7: "Runtime Error (SIGSEGV)",
    8: "Runtime Error (SIGXFSZ)",
    9: "Runtime Error (SIGFPE)",
    10: "Runtime Error (SIGABRT)",
    11: "Runtime Error (NZEC)",
    12: "Runtime Error (Other)",
    13: "Internal Error",
    14: "Exec Format Error",
  };
  return statusMap[statusId] || "Unknown";
}

function mapToSubmissionStatus(statusId: number): string {
  if (statusId === 3) return "accepted";
  if (statusId === 4) return "wrong_answer";
  if (statusId === 5) return "time_limit";
  if (statusId === 6) return "compile_error";
  if (statusId >= 7 && statusId <= 12) return "runtime_error";
  return "pending";
}

export async function POST(request: NextRequest) {
  const { code, language, stdin, problemId, submit } = await request.json();

  if (!code || !language) {
    return Response.json({ error: "code and language are required" }, { status: 400 });
  }

  const languageId = getJudge0LanguageId(language);

  try {
    // Submit to Judge0
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add RapidAPI headers if using hosted version
    if (JUDGE0_API_KEY) {
      headers["X-RapidAPI-Key"] = JUDGE0_API_KEY;
      headers["X-RapidAPI-Host"] = JUDGE0_API_HOST;
    }

    const createResponse = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        source_code: Buffer.from(code).toString("base64"),
        language_id: languageId,
        stdin: stdin ? Buffer.from(stdin).toString("base64") : "",
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("Judge0 error:", createResponse.status, errorText);
      return Response.json(
        { status: "Error", stdout: null, stderr: `Judge0 API error: ${createResponse.status}`, compile_output: null, time: null, memory: null },
        { status: 200 }
      );
    }

    const result = await createResponse.json();

    // Decode base64 outputs
    const stdout = result.stdout ? Buffer.from(result.stdout, "base64").toString("utf-8") : null;
    const stderr = result.stderr ? Buffer.from(result.stderr, "base64").toString("utf-8") : null;
    const compileOutput = result.compile_output
      ? Buffer.from(result.compile_output, "base64").toString("utf-8")
      : null;

    const statusText = mapStatus(result.status?.id ?? 0);

    // If this is a submission, save to DB
    if (submit && problemId) {
      const userId = await getCurrentUserId();
      if (userId) {
        const supabase = createServerSupabaseClient();
        await supabase.from("coding_submissions").insert({
          user_id: userId,
          problem_id: problemId,
          language,
          code,
          status: mapToSubmissionStatus(result.status?.id ?? 0),
          runtime_ms: result.time ? Math.round(parseFloat(result.time) * 1000) : null,
          memory_kb: result.memory || null,
          stdout,
          stderr: stderr || compileOutput,
          test_cases_passed: result.status?.id === 3 ? 1 : 0,
          test_cases_total: 1,
        });
      }
    }

    return Response.json({
      status: statusText,
      stdout,
      stderr,
      compile_output: compileOutput,
      time: result.time ? `${result.time}s` : null,
      memory: result.memory,
    });
  } catch (error) {
    console.error("Code execution error:", error);
    return Response.json(
      { status: "Error", stdout: null, stderr: "Internal server error", compile_output: null, time: null, memory: null },
      { status: 200 }
    );
  }
}
