"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, BookOpen, Tag } from "lucide-react";
import type { CodingProblem } from "@/types/coding";

interface ProblemPanelProps {
  problem: CodingProblem;
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
      return "bg-muted text-muted-foreground";
  }
}

export function ProblemPanel({ problem }: ProblemPanelProps) {
  const [showHints, setShowHints] = useState(false);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Tabs defaultValue="description" className="flex h-full flex-col">
        <TabsList className="mx-4 mt-3 w-fit">
          <TabsTrigger value="description">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            Description
          </TabsTrigger>
          {problem.hints.length > 0 && (
            <TabsTrigger value="hints">
              <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
              Hints
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="description" className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Title + Difficulty */}
          <div className="flex items-center gap-3 py-3">
            <h2 className="text-lg font-bold">
              {problem.leetcodeId}. {problem.title}
            </h2>
            <Badge
              variant="outline"
              className={getDifficultyColor(problem.difficulty)}
            >
              {problem.difficulty}
            </Badge>
          </div>

          {/* Topics */}
          {problem.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {problem.topics.map((topic) => (
                <Badge key={topic} variant="secondary" className="text-xs">
                  <Tag className="h-2.5 w-2.5 mr-1" />
                  {topic}
                </Badge>
              ))}
            </div>
          )}

          {/* Description */}
          <div
            className="prose prose-invert prose-sm max-w-none [&_pre]:bg-muted/50 [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-xs [&_p]:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: problem.description }}
          />

          {/* Examples */}
          {problem.examples.length > 0 && (
            <div className="mt-4 space-y-3">
              {problem.examples.map((ex) => (
                <div
                  key={ex.example_num}
                  className="rounded-lg border border-border/50 bg-muted/30 p-3"
                >
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                    Example {ex.example_num}:
                  </p>
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {ex.example_text}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* Constraints */}
          {problem.constraints.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold mb-2">Constraints:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {problem.constraints.map((c, i) => (
                  <li key={i} className="font-mono text-xs">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        {problem.hints.length > 0 && (
          <TabsContent value="hints" className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-3 pt-3">
              {problem.hints.map((hint, i) => (
                <div key={i}>
                  <button
                    onClick={() => setShowHints(true)}
                    className="w-full text-left rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 hover:bg-violet-500/10 transition-colors"
                  >
                    <p className="text-xs font-medium text-violet-400 mb-1">
                      Hint {i + 1}
                    </p>
                    <p className={`text-sm ${showHints ? "" : "blur-sm select-none"}`}>
                      {hint}
                    </p>
                    {!showHints && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to reveal
                      </p>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
