"use client";

import { useState, useEffect, useRef } from "react";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodingTimerProps {
  className?: string;
}

const PRESETS = [
  { label: "30m", seconds: 30 * 60 },
  { label: "45m", seconds: 45 * 60 },
  { label: "60m", seconds: 60 * 60 },
] as const;

export function CodingTimer({ className }: CodingTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(45 * 60); // default 45 min
  const [remaining, setRemaining] = useState(45 * 60);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, remaining]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;
  const isLow = remaining <= 60 && remaining > 0 && started;
  const isExpired = remaining === 0 && started;

  const handlePreset = (seconds: number) => {
    setTotalSeconds(seconds);
    setRemaining(seconds);
    setRunning(false);
    setStarted(false);
  };

  const handleStart = () => {
    setRunning(true);
    setStarted(true);
  };

  const handlePause = () => {
    setRunning(false);
  };

  const handleReset = () => {
    setRunning(false);
    setStarted(false);
    setRemaining(totalSeconds);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Presets (only show when not started) */}
      {!started && (
        <div className="flex items-center gap-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset.seconds)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                totalSeconds === preset.seconds
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Timer display */}
      <div className={cn(
        "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-mono font-medium transition-all",
        isExpired && "border-red-500/50 bg-red-500/10 text-red-400 animate-pulse",
        isLow && !isExpired && "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
        !isLow && !isExpired && "border-border text-foreground"
      )}>
        <Timer className={cn("h-3 w-3", isExpired ? "text-red-400" : isLow ? "text-yellow-400" : "text-violet-400")} />
        <span>{formatTime(remaining)}</span>

        {/* Progress bar */}
        {started && (
          <div className="w-12 h-1 rounded-full bg-muted overflow-hidden ml-1">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isExpired ? "bg-red-500" : isLow ? "bg-yellow-500" : "bg-violet-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      {!started ? (
        <button onClick={handleStart} className="rounded p-1 hover:bg-muted transition-colors" title="Start timer">
          <Play className="h-3.5 w-3.5 text-green-400" />
        </button>
      ) : (
        <>
          <button onClick={running ? handlePause : handleStart} className="rounded p-1 hover:bg-muted transition-colors">
            {running ? <Pause className="h-3.5 w-3.5 text-yellow-400" /> : <Play className="h-3.5 w-3.5 text-green-400" />}
          </button>
          <button onClick={handleReset} className="rounded p-1 hover:bg-muted transition-colors" title="Reset">
            <RotateCcw className="h-3 w-3 text-muted-foreground" />
          </button>
        </>
      )}
    </div>
  );
}
