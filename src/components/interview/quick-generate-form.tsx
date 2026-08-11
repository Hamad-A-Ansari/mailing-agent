"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Briefcase, Loader2, Sparkles } from "lucide-react";

interface QuickGenerateFormProps {
  company: string;
  role: string;
  userId: string;
}

export function QuickGenerateForm({ company, role, userId }: QuickGenerateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "technical",
    level: "mid",
    techstack: "",
    amount: 5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/vapi/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          company,
          type: formData.type,
          level: formData.level,
          techstack: formData.techstack,
          amount: formData.amount,
          userid: userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/interview");
      } else {
        alert("Failed to generate interview. Try again.");
      }
    } catch {
      alert("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6">
      {/* Pre-filled info banner */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-violet-500/20">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20 border border-violet-500/30">
          <img
            src={`https://www.google.com/s2/favicons?domain=${company.toLowerCase().replace(/\s+/g, "")}.com&sz=32`}
            alt=""
            className="h-5 w-5 rounded"
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-violet-400" />
            <span className="font-medium text-sm">{company}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{role}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Interview Type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Interview Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(["technical", "behavioral", "mixed"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, type })}
                className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-all ${
                  formData.type === type
                    ? "border-violet-500 bg-violet-500/15 text-violet-300"
                    : "border-border hover:border-violet-500/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Experience Level */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Experience Level</label>
          <div className="grid grid-cols-4 gap-2">
            {([
              { value: "junior", label: "Junior" },
              { value: "mid", label: "Mid" },
              { value: "senior", label: "Senior" },
              { value: "lead", label: "Lead" },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormData({ ...formData, level: value })}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  formData.level === value
                    ? "border-violet-500 bg-violet-500/15 text-violet-300"
                    : "border-border hover:border-violet-500/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tech Stack</label>
          <input
            type="text"
            placeholder="e.g. React, Node.js, TypeScript, AWS"
            value={formData.techstack}
            onChange={(e) => setFormData({ ...formData, techstack: e.target.value })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 placeholder:text-muted-foreground/50"
            required
          />
          <p className="text-[10px] text-muted-foreground">Comma-separated technologies</p>
        </div>

        {/* Number of Questions */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Number of Questions</label>
          <div className="grid grid-cols-4 gap-2">
            {[3, 5, 7, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setFormData({ ...formData, amount: num })}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  formData.amount === num
                    ? "border-violet-500 bg-violet-500/15 text-violet-300"
                    : "border-border hover:border-violet-500/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !formData.techstack.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-medium text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Interview
            </>
          )}
        </button>
      </form>
    </div>
  );
}
