"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp } from "lucide-react";

interface TopicProgress {
  topic: string;
  total: number;
  solved: number;
  easy: number;
  easySolved: number;
  medium: number;
  mediumSolved: number;
  hard: number;
  hardSolved: number;
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<TopicProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [overall, setOverall] = useState({ total: 0, solved: 0 });

  useEffect(() => {
    fetch("/api/coding-progress")
      .then((r) => r.json())
      .then((data) => {
        setProgress(data.topics || []);
        setOverall(data.overall || { total: 0, solved: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const overallPct = overall.total > 0 ? Math.round((overall.solved / overall.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-violet-400" />
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Topic Progress
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">Track your progress across DSA topics.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        </div>
      ) : (
        <>
          {/* Overall */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold">Overall</span>
              <span className="text-sm text-muted-foreground">{overall.solved}/{overall.total} ({overallPct}%)</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all" style={{ width: `${overallPct}%` }} />
            </div>
          </div>

          {/* Per-topic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {progress.map((topic) => {
              const pct = topic.total > 0 ? Math.round((topic.solved / topic.total) * 100) : 0;
              return (
                <div key={topic.topic} className="rounded-xl border bg-card p-4 hover:border-violet-500/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{topic.topic}</span>
                    <span className="text-xs text-muted-foreground">{topic.solved}/{topic.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span className="text-green-400">Easy: {topic.easySolved}/{topic.easy}</span>
                    <span className="text-yellow-400">Med: {topic.mediumSolved}/{topic.medium}</span>
                    <span className="text-red-400">Hard: {topic.hardSolved}/{topic.hard}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
