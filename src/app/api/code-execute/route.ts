import { NextRequest } from "next/server";
import { SUPPORTED_LANGUAGES } from "@/types/coding";
import type { SupportedLanguageId } from "@/types/coding";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/auth-server";
import { parseSignature, generateHarness, parseTestCases } from "@/lib/harness";
import type { ParsedTestCase } from "@/lib/harness";

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || "";
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || "judge0-ce.p.rapidapi.com";

function getJudge0LanguageId(language: SupportedLanguageId): number {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.id === language);
  return lang?.judge0Id ?? 71;
}

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

interface Judge0Result {
  status?: { id: number };
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  time?: string;
  memory?: number;
}

async function executeOnJudge0(
  sourceCode: string,
  languageId: number,
  stdin: string
): Promise<Judge0Result> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (JUDGE0_API_KEY) {
    headers["X-RapidAPI-Key"] = JUDGE0_API_KEY;
    headers["X-RapidAPI-Host"] = JUDGE0_API_HOST;
  }

  const res = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source_code: Buffer.from(sourceCode).toString("base64"),
      language_id: languageId,
      stdin: stdin ? Buffer.from(stdin).toString("base64") : "",
      cpu_time_limit: 5,
      memory_limit: 256000,
    }),
  });

  if (!res.ok) {
    throw new Error(`Judge0 API error: ${res.status}`);
  }

  return res.json();
}

function decodeBase64(str: string | undefined | null): string | null {
  if (!str) return null;
  return Buffer.from(str, "base64").toString("utf-8");
}

/**
 * For compiled languages, if there's no main(), add one so it at least compiles.
 */
function wrapWithBasicMain(code: string, language: string): string {
  if (language === "cpp" && !code.includes("int main")) {
    return `#include <bits/stdc++.h>\nusing namespace std;\n\n${code}\n\nint main() {\n    // No test harness - code compiles but won't produce output\n    return 0;\n}\n`;
  }
  if (language === "java" && !code.includes("public static void main")) {
    return `import java.util.*;\nimport java.io.*;\n\n${code}\n\nclass Main {\n    public static void main(String[] args) {\n        // No test harness\n    }\n}\n`;
  }
  return code;
}

/**
 * Compare output with expected, normalizing whitespace and JSON formatting.
 */
function compareOutput(actual: string | null, expected: string): boolean {
  if (!actual) return false;
  const normalize = (s: string) =>
    s.trim().replace(/\s+/g, "").replace(/'/g, '"');
  return normalize(actual) === normalize(expected);
}

export async function POST(request: NextRequest) {
  const { code, language, problemId, submit } = await request.json();

  if (!code || !language) {
    return Response.json({ error: "code and language are required" }, { status: 400 });
  }

  const languageId = getJudge0LanguageId(language as SupportedLanguageId);

  try {
    // If we have a problemId, use the harness system
    let testCases: ParsedTestCase[] = [];
    let useHarness = false;
    let starterCode = "";

    if (problemId) {
      const supabase = createServerSupabaseClient();
      const { data: problem } = await supabase
        .from("coding_problems")
        .select("code_snippets, examples")
        .eq("id", problemId)
        .maybeSingle();

      if (problem) {
        starterCode = problem.code_snippets?.[language] || "";
        testCases = parseTestCases(problem.examples || []);
        useHarness = testCases.length > 0 && !!starterCode;
      }
    }

    if (useHarness && testCases.length > 0) {
      // --- Harness Mode: run against all test cases ---
      const signature = parseSignature(starterCode, language);

      if (!signature) {
        // Can't parse signature — fall back to raw execution with basic main wrapper
        const wrappedCode = wrapWithBasicMain(code, language);
        return await executeRaw(wrappedCode, languageId, "", problemId, language, submit);
      }

      let passed = 0;
      const total = testCases.length;
      let lastStdout: string | null = null;
      let lastStderr: string | null = null;
      let lastCompileOutput: string | null = null;
      let lastTime: string | null = null;
      let lastMemory: number | null = null;
      let lastStatusId = 3;
      let failedCase: { input: string; expected: string; actual: string } | null = null;

      for (const testCase of testCases) {
        const { sourceCode, stdin } = generateHarness(code, signature, language, testCase.stdin);
        const result = await executeOnJudge0(sourceCode, languageId, stdin);

        const stdout = decodeBase64(result.stdout);
        const stderr = decodeBase64(result.stderr);
        const compileOutput = decodeBase64(result.compile_output);

        lastStdout = stdout;
        lastStderr = stderr;
        lastCompileOutput = compileOutput;
        lastTime = result.time ? `${result.time}s` : null;
        lastMemory = result.memory || null;
        lastStatusId = result.status?.id ?? 0;

        // If compilation/runtime error, stop immediately
        if (lastStatusId !== 3 && lastStatusId !== 4) {
          break;
        }

        // Compare output
        if (compareOutput(stdout, testCase.expected)) {
          passed++;
        } else {
          lastStatusId = 4; // Wrong Answer
          failedCase = {
            input: testCase.stdin,
            expected: testCase.expected,
            actual: stdout || "(no output)",
          };
          break; // Stop on first failure
        }
      }

      const allPassed = passed === total;
      const statusText = allPassed ? "Accepted" : mapStatus(lastStatusId);

      // Build detailed output
      let outputMessage = lastStdout || "";
      if (failedCase) {
        outputMessage = `Input:\n${failedCase.input}\n\nExpected:\n${failedCase.expected}\n\nYour Output:\n${failedCase.actual}`;
      }

      // Save submission if requested
      if (submit && problemId) {
        const userId = await getCurrentUserId();
        if (userId) {
          const supabase = createServerSupabaseClient();
          await supabase.from("coding_submissions").insert({
            user_id: userId,
            problem_id: problemId,
            language,
            code,
            status: allPassed ? "accepted" : mapToSubmissionStatus(lastStatusId),
            runtime_ms: lastTime ? Math.round(parseFloat(lastTime) * 1000) : null,
            memory_kb: lastMemory,
            stdout: outputMessage,
            stderr: lastStderr || lastCompileOutput,
            test_cases_passed: passed,
            test_cases_total: total,
          });
        }
      }

      return Response.json({
        status: statusText,
        stdout: outputMessage,
        stderr: lastStderr,
        compile_output: lastCompileOutput,
        time: lastTime,
        memory: lastMemory,
        testCasesPassed: passed,
        testCasesTotal: total,
      });
    } else {
      // --- Raw Mode: no harness, just run the code ---
      // For compiled languages, wrap with basic main if needed
      const wrappedCode = wrapWithBasicMain(code, language);
      return await executeRaw(wrappedCode, languageId, "", problemId, language, submit);
    }
  } catch (error) {
    console.error("Code execution error:", error);
    return Response.json(
      { status: "Error", stdout: null, stderr: String(error), compile_output: null, time: null, memory: null },
      { status: 200 }
    );
  }
}

/**
 * Raw execution without harness (fallback).
 */
async function executeRaw(
  code: string,
  languageId: number,
  stdin: string,
  problemId: string | undefined,
  language: string,
  submit: boolean
) {
  try {
    const result = await executeOnJudge0(code, languageId, stdin);

    const stdout = decodeBase64(result.stdout);
    const stderr = decodeBase64(result.stderr);
    const compileOutput = decodeBase64(result.compile_output);
    const statusText = mapStatus(result.status?.id ?? 0);

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
    return Response.json(
      { status: "Error", stdout: null, stderr: String(error), compile_output: null, time: null, memory: null },
      { status: 200 }
    );
  }
}
