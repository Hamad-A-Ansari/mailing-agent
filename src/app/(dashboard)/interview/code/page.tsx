"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Code2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface ProblemListItem {
  id: string;
  leetcodeId: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  companyTags: string[];
}

interface ProblemListResponse {
  problems: ProblemListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "Easy":
      return "bg-green-500/15 text-green-400 border-green-500/30";
    case "Medium":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "Hard":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "";
  }
}

export default function ProblemBrowserPage() {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("pageSize", "30");
    if (difficulty !== "all") params.set("difficulty", difficulty);
    if (search.trim()) params.set("search", search.trim());

    try {
      const res = await fetch(`/api/coding-problems?${params}`);
      const data: ProblemListResponse = await res.json();
      setProblems(data.problems || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      setProblems([]);
    } finally {
      setLoading(false);
    }
  }, [page, difficulty, search]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Code2 className="h-6 w-6 text-violet-400" />
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Coding Problems
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Pick a problem and practice in the built-in code editor.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search problems..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
          />
        </div>

        <Select
          value={difficulty}
          onValueChange={(v) => { setDifficulty(v || "all"); setPage(1); }}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Easy">Easy</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Hard">Hard</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {total} problems
        </span>
      </div>

      {/* Problem List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        </div>
      ) : problems.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No problems found. {search && "Try a different search term."}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16">#</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">Difficulty</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Topics</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => (
                <tr
                  key={problem.id}
                  className="border-b border-border/50 hover:bg-violet-500/5 transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {problem.leetcodeId}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {problem.title}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getDifficultyColor(problem.difficulty)}`}
                    >
                      {problem.difficulty}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {problem.topics.slice(0, 3).map((topic) => (
                        <Badge key={topic} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {topic}
                        </Badge>
                      ))}
                      {problem.topics.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{problem.topics.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/interview/code/${problem.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-violet-600/80 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-500 transition-colors"
                    >
                      Solve
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
