/**
 * Coding interview types.
 */

export interface CodingProblem {
  id: string;
  leetcodeId: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  description: string;
  examples: ProblemExample[];
  constraints: string[];
  hints: string[];
  codeSnippets: Record<string, string>;
  companyTags: string[];
  createdAt: string;
}

export interface ProblemExample {
  example_num: number;
  example_text: string;
  images?: string[];
}

export interface CodingSubmission {
  id: string;
  userId: string;
  problemId: string;
  language: string;
  code: string;
  status: SubmissionStatus;
  runtimeMs: number | null;
  memoryKb: number | null;
  stdout: string | null;
  stderr: string | null;
  testCasesPassed: number;
  testCasesTotal: number;
  createdAt: string;
}

export type SubmissionStatus =
  | "pending"
  | "accepted"
  | "wrong_answer"
  | "time_limit"
  | "runtime_error"
  | "compile_error";

export interface ProblemListFilters {
  difficulty?: "Easy" | "Medium" | "Hard";
  topic?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const SUPPORTED_LANGUAGES = [
  { id: "python3", label: "Python 3", monacoId: "python", judge0Id: 71 },
  { id: "javascript", label: "JavaScript", monacoId: "javascript", judge0Id: 63 },
  { id: "typescript", label: "TypeScript", monacoId: "typescript", judge0Id: 74 },
  { id: "java", label: "Java", monacoId: "java", judge0Id: 62 },
  { id: "cpp", label: "C++", monacoId: "cpp", judge0Id: 54 },
  { id: "csharp", label: "C#", monacoId: "csharp", judge0Id: 51 },
  { id: "golang", label: "Go", monacoId: "go", judge0Id: 60 },
  { id: "rust", label: "Rust", monacoId: "rust", judge0Id: 73 },
  { id: "kotlin", label: "Kotlin", monacoId: "kotlin", judge0Id: 78 },
  { id: "swift", label: "Swift", monacoId: "swift", judge0Id: 83 },
] as const;

export type SupportedLanguageId = (typeof SUPPORTED_LANGUAGES)[number]["id"];
