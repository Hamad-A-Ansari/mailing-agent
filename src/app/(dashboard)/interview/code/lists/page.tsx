"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, Loader2, BookOpen, Target } from "lucide-react";

// Blind 75 problem slugs (by LeetCode frontend_id)
const BLIND_75: string[] = [
  "1","3","5","11","15","17","19","20","21","23","33","39","42","46","48","49","53","54","55","56",
  "57","62","70","72","73","76","78","79","91","98","100","102","104","105","121","124","125","128",
  "130","133","139","141","143","146","152","153","167","169","190","191","198","200","206","207",
  "208","211","212","213","217","226","230","235","236","238","242","252","253","261","268","269",
  "271","286","295","297","300","322","338","347","371","417",
];

// NeetCode 150 — Blind 75 + additional problems
const NEETCODE_150: string[] = [
  ...BLIND_75,
  "2","4","7","22","25","36","37","40","43","45","50","51","66","74","84","85","86","90","93","97",
  "101","103","106","108","110","115","127","131","134","136","138","142","148","150","155","160",
  "166","178","179","187","189","199","202","210","215","218","221","224","227","234","239","240",
  "243","244","245","246","247","248","249","250","251","254","256","259","260","263","264","265",
  "266","267","270","273","276","277","278","279","280","281","282","283","284","285","287","289",
  "290","291","292","293","294","296","298","299","301","302","303","304","305","306","307","308",
];

// Remove duplicates
const NEETCODE_150_UNIQUE = [...new Set(NEETCODE_150)];

interface ProblemProgress {
  id: string;
  leetcodeId: string;
  title: string;
  difficulty: string;
  topics: string[];
  solved: boolean;
}

function getDifficultyColor(d: string) {
  if (d === "Easy") return "bg-green-500/15 text-green-400 border-green-500/30";
  if (d === "Medium") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
}

export default function CuratedListsPage() {
  const [activeList, setActiveList] = useState<"blind75" | "neetcode150">("blind75");
  const [problems, setProblems] = useState<ProblemProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = activeList === "blind75" ? BLIND_75 : NEETCODE_150_UNIQUE;
    setLoading(true);

    fetch(`/api/coding-problems/list?ids=${ids.join(",")}`).then((r) => r.json())
      .then((data) => setProblems(data.problems || []))
      .catch(() => setProblems([]))
      .finally(() => setLoading(false));
  }, [activeList]);

  const solvedCount = problems.filter((p) => p.solved).length;
  const totalCount = problems.length;
  const progressPct = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-violet-400" />
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Curated Lists
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Popular interview prep problem sets with progress tracking.
        </p>
      </div>

      <Tabs value={activeList} onValueChange={(v) => setActiveList(v as "blind75" | "neetcode150")}>
        <TabsList>
          <TabsTrigger value="blind75" className="gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Blind 75
          </TabsTrigger>
          <TabsTrigger value="neetcode150" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            NeetCode 150
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeList} className="mt-4 space-y-4">
          {/* Progress bar */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{solvedCount}/{totalCount} solved ({progressPct}%)</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Problem list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-center px-3 py-2.5 w-10"></th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-12">#</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Title</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-24">Difficulty</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Topics</th>
                    <th className="px-3 py-2.5 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {problems.map((problem) => (
                    <tr key={problem.id} className="border-b border-border/50 hover:bg-violet-500/5 transition-colors">
                      <td className="text-center px-3 py-2.5">
                        {problem.solved ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{problem.leetcodeId}</td>
                      <td className="px-3 py-2.5 font-medium">{problem.title}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={`text-[10px] ${getDifficultyColor(problem.difficulty)}`}>
                          {problem.difficulty}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {problem.topics.slice(0, 2).map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={`/interview/code/${problem.id}`}
                          className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
