"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ProblemPanel } from "@/components/coding/problem-panel";
import { CodeEditor } from "@/components/coding/code-editor";
import { CodingTimer } from "@/components/coding/coding-timer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Send, Loader2, CheckCircle2, XCircle, Timer } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/types/coding";
import type { CodingProblem, SupportedLanguageId } from "@/types/coding";

/**
 * Strip boilerplate (imports, includes, using namespace) from starter code.
 * User only sees the class/function body. The harness adds them back server-side.
 */
function stripBoilerplate(code: string, language: string): string {
  if (!code) return "";
  
  switch (language) {
    case "cpp": {
      // Remove #include, using namespace, keep class/struct/function
      return code
        .split("\n")
        .filter((line) => {
          const trimmed = line.trim();
          return !trimmed.startsWith("#include") && !trimmed.startsWith("using namespace");
        })
        .join("\n")
        .trim();
    }
    case "java": {
      // Remove import statements, keep class
      return code
        .split("\n")
        .filter((line) => !line.trim().startsWith("import "))
        .join("\n")
        .trim();
    }
    case "python3":
    case "python": {
      // Remove "from typing import *" and similar, keep class
      return code
        .split("\n")
        .filter((line) => {
          const trimmed = line.trim();
          return !trimmed.startsWith("from ") && !trimmed.startsWith("import ");
        })
        .join("\n")
        .trim();
    }
    case "golang":
    case "go": {
      // Remove package, import blocks
      return code
        .replace(/^package\s+\w+\s*\n/m, "")
        .replace(/import\s*\([^)]*\)\s*\n?/g, "")
        .replace(/import\s+"[^"]+"\s*\n?/g, "")
        .trim();
    }
    default:
      return code;
  }
}

interface TestCaseResult {
  caseNum: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  status: string;
}

interface ExecutionResult {
  status: string;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: number | null;
  testCasesPassed?: number;
  testCasesTotal?: number;
  testResults?: TestCaseResult[];
}

export default function CodingInterviewPage() {
  const params = useParams();
  const problemId = params.id as string;

  const [problem, setProblem] = useState<CodingProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<SupportedLanguageId>("python3");
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [activeTab, setActiveTab] = useState("testcases");

  useEffect(() => {
    fetch(`/api/coding-problems/${problemId}`)
      .then((r) => r.json())
      .then((data) => {
        setProblem(data);
        // Set initial code from snippets — show only the function body
        const snippet = data.codeSnippets?.[language] || data.codeSnippets?.["python3"] || "";
        setCode(stripBoilerplate(snippet, language));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [problemId]);

  // Update code when language changes
  useEffect(() => {
    if (problem?.codeSnippets?.[language]) {
      setCode(stripBoilerplate(problem.codeSnippets[language], language));
    }
  }, [language, problem]);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setActiveTab("output");

    try {
      const res = await fetch("/api/code-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          stdin: problem?.examples?.[0]?.example_text?.split("\n")?.[0]?.replace("Input: ", "") || "",
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ status: "error", stdout: null, stderr: "Failed to execute", compile_output: null, time: null, memory: null });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setResult(null);
    setActiveTab("output");

    try {
      const res = await fetch("/api/code-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          problemId,
          submit: true,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ status: "error", stdout: null, stderr: "Failed to submit", compile_output: null, time: null, memory: null });
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter → Run
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!running && !submitting) handleRun();
      }
      // Ctrl+Shift+Enter or Cmd+Shift+Enter → Submit
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        if (!running && !submitting) handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, submitting, code, language, problemId]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center text-muted-foreground">
        Problem not found
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] -m-6">
      <ResizablePanelGroup orientation="horizontal">
        {/* Left: Problem Description */}
        <ResizablePanel defaultSize={40} minSize={25}>
          <ProblemPanel problem={problem} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right: Code Editor + Output */}
        <ResizablePanel defaultSize={60} minSize={35}>
          <div className="flex h-full flex-col">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between border-b px-4 py-2">
              <Select value={language} onValueChange={(v) => setLanguage(v as SupportedLanguageId)}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id} className="text-xs">
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <CodingTimer />
                <button
                  onClick={handleRun}
                  disabled={running || submitting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
                  title="Run (Ctrl+Enter)"
                >
                  {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Run
                  <kbd className="ml-1 hidden sm:inline-flex items-center rounded bg-background/50 px-1 py-0.5 text-[9px] text-muted-foreground border">⌘↵</kbd>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={running || submitting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-green-600 to-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50"
                  title="Submit (Ctrl+Shift+Enter)"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Submit
                  <kbd className="ml-1 hidden sm:inline-flex items-center rounded bg-white/10 px-1 py-0.5 text-[9px] text-white/70 border border-white/20">⌘⇧↵</kbd>
                </button>
              </div>
            </div>

            {/* Editor + Output Split */}
            <ResizablePanelGroup orientation="vertical">
              {/* Code Editor */}
              <ResizablePanel defaultSize={70} minSize={30}>
                <CodeEditor language={language} value={code} onChange={setCode} />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Output Panel */}
              <ResizablePanel defaultSize={30} minSize={15}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  <TabsList className="mx-3 mt-2 w-fit h-7">
                    <TabsTrigger value="testcases" className="text-xs h-6">Testcases</TabsTrigger>
                    <TabsTrigger value="output" className="text-xs h-6">Output</TabsTrigger>
                  </TabsList>

                  <TabsContent value="testcases" className="flex-1 overflow-y-auto px-4 pb-3">
                    <div className="space-y-2 pt-2">
                      {problem.examples.map((ex, i) => (
                        <div key={i} className="rounded-md bg-muted/50 p-2.5 font-mono text-xs">
                          <p className="text-muted-foreground text-[10px] mb-1">Case {i + 1}</p>
                          <pre className="whitespace-pre-wrap">{ex.example_text}</pre>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="output" className="flex-1 overflow-y-auto px-4 pb-3">
                    {result ? (
                      <div className="space-y-3 pt-2">
                        {/* Overall Status Header */}
                        <div className="flex items-center gap-2">
                          {result.status === "Accepted" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                          <span className={`text-sm font-bold ${result.status === "Accepted" ? "text-green-400" : "text-red-400"}`}>
                            {result.status}
                          </span>
                          {result.testCasesPassed !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              ({result.testCasesPassed}/{result.testCasesTotal} passed)
                            </span>
                          )}
                          {result.time && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                              <Timer className="h-3 w-3" />
                              {result.time}
                            </span>
                          )}
                        </div>

                        {/* Per-test-case results */}
                        {result.testResults && result.testResults.length > 0 && (
                          <div className="space-y-2">
                            {result.testResults.map((tc) => (
                              <div
                                key={tc.caseNum}
                                className={`rounded-lg border p-3 transition-all ${
                                  tc.passed
                                    ? "border-green-500/30 bg-green-500/5 shadow-[0_0_8px_rgba(34,197,94,0.1)]"
                                    : "border-red-500/30 bg-red-500/5 shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  {tc.passed ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                                  )}
                                  <span className={`text-xs font-semibold ${tc.passed ? "text-green-400" : "text-red-400"}`}>
                                    Case {tc.caseNum}
                                  </span>
                                  <span className={`text-[10px] ml-auto ${tc.passed ? "text-green-400/70" : "text-red-400/70"}`}>
                                    {tc.status}
                                  </span>
                                </div>
                                <div className="grid gap-1.5 text-xs font-mono">
                                  <div>
                                    <span className="text-[10px] text-muted-foreground">Input:</span>
                                    <pre className="mt-0.5 whitespace-pre-wrap text-muted-foreground/90">{tc.input}</pre>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-muted-foreground">Expected:</span>
                                    <pre className="mt-0.5 whitespace-pre-wrap text-emerald-300">{tc.expected}</pre>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-muted-foreground">Your Output:</span>
                                    <pre className={`mt-0.5 whitespace-pre-wrap ${tc.passed ? "text-green-300" : "text-red-300"}`}>
                                      {tc.actual}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Compilation/Runtime Errors (when no test results) */}
                        {(!result.testResults || result.testResults.length === 0) && (result.stderr || result.compile_output) && (
                          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                            <p className="text-[10px] text-red-400 mb-1">
                              {result.compile_output ? "Compile Error" : "Runtime Error"}
                            </p>
                            <pre className="font-mono text-xs whitespace-pre-wrap text-red-300">
                              {result.compile_output || result.stderr}
                            </pre>
                          </div>
                        )}

                        {/* Fallback: raw stdout if no testResults */}
                        {(!result.testResults || result.testResults.length === 0) && result.stdout && !result.stderr && !result.compile_output && (
                          <div className="rounded-md bg-muted/50 p-2.5">
                            <p className="text-[10px] text-muted-foreground mb-1">stdout</p>
                            <pre className="font-mono text-xs whitespace-pre-wrap text-green-300">{result.stdout}</pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                        Run your code to see output
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
