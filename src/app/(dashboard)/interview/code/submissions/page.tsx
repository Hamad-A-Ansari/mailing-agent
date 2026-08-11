"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { History, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface Submission {
  id: string;
  problemId: string;
  problemTitle: string;
  problemNumber: string;
  difficulty: string;
  language: string;
  status: string;
  runtimeMs: number | null;
  memoryKb: number | null;
  testCasesPassed: number;
  testCasesTotal: number;
  createdAt: string;
}

function getStatusIcon(status: string) {
  if (status === "accepted") return <CheckCircle2 className="h-4 w-4 text-green-400" />;
  if (status === "wrong_answer") return <XCircle className="h-4 w-4 text-red-400" />;
  if (status === "time_limit") return <Clock className="h-4 w-4 text-yellow-400" />;
  return <XCircle className="h-4 w-4 text-orange-400" />;
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    accepted: "Accepted",
    wrong_answer: "Wrong Answer",
    time_limit: "Time Limit",
    runtime_error: "Runtime Error",
    compile_error: "Compile Error",
    pending: "Pending",
  };
  return map[status] || status;
}

function getStatusColor(status: string) {
  if (status === "accepted") return "text-green-400";
  if (status === "wrong_answer") return "text-red-400";
  if (status === "time_limit") return "text-yellow-400";
  return "text-orange-400";
}

function getDifficultyColor(d: string) {
  if (d === "Easy") return "bg-green-500/15 text-green-400 border-green-500/30";
  if (d === "Medium") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/coding-submissions?page=${page}&pageSize=20`);
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6 text-violet-400" />
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Submissions
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">Your coding submission history.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No submissions yet. Solve a problem to see your history here.
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Problem</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">Language</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">Runtime</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">Tests</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-36">Date</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id} className="border-b border-border/50 hover:bg-violet-500/5 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/interview/code/${sub.problemId}`} className="hover:text-violet-400 transition-colors">
                      <span className="text-muted-foreground font-mono text-xs mr-2">{sub.problemNumber}.</span>
                      <span className="font-medium">{sub.problemTitle}</span>
                    </Link>
                    <Badge variant="outline" className={`ml-2 text-[10px] ${getDifficultyColor(sub.difficulty)}`}>
                      {sub.difficulty}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(sub.status)}
                      <span className={`text-xs font-medium ${getStatusColor(sub.status)}`}>
                        {getStatusLabel(sub.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-[10px] capitalize">{sub.language}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    {sub.runtimeMs ? `${sub.runtimeMs}ms` : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {sub.testCasesPassed}/{sub.testCasesTotal}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {format(new Date(sub.createdAt), "MMM d, yyyy h:mm a")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-muted transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-muted transition-colors">
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
