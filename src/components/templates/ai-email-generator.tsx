"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface AIEmailGeneratorProps {
  onGenerated: (email: string) => void;
}

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "direct", label: "Direct & Brief" },
] as const;

export function AIEmailGenerator({ onGenerated }: AIEmailGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    jobDescription: "",
    resumeText: "",
    company: "",
    role: "",
    recipientName: "",
    tone: "professional",
  });

  const handleGenerate = async () => {
    setLoading(true);
    setGenerated("");

    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.email) {
        setGenerated(data.email);
      } else {
        toast.add({ title: "Failed to generate", type: "error" });
      }
    } catch {
      toast.add({ title: "Something went wrong", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.add({ title: "Copied to clipboard", type: "success" });
  };

  const handleUse = () => {
    onGenerated(generated);
    setOpen(false);
    toast.add({ title: "Email added to template", type: "success" });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600/80 to-indigo-600/80 px-3 py-1.5 text-xs font-medium text-white hover:from-violet-500 hover:to-indigo-500 transition-all"
      >
        <Sparkles className="h-3 w-3" />
        Generate with AI
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-violet-300">AI Email Generator</h3>
        </div>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Company</label>
          <input
            type="text"
            placeholder="e.g. Google"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Target Role</label>
          <input
            type="text"
            placeholder="e.g. Software Engineer"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Job Description (optional)</label>
        <textarea
          placeholder="Paste the job description here for a more targeted email..."
          value={formData.jobDescription}
          onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Your Background (optional)</label>
        <textarea
          placeholder="Paste key points from your resume or describe your experience..."
          value={formData.resumeText}
          onChange={(e) => setFormData({ ...formData, resumeText: e.target.value })}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="space-y-1 flex-1">
          <label className="text-xs font-medium text-muted-foreground">Tone</label>
          <div className="flex gap-1.5 flex-wrap">
            {TONES.map((tone) => (
              <button
                key={tone.value}
                onClick={() => setFormData({ ...formData, tone: tone.value })}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${
                  formData.tone === tone.value
                    ? "border-violet-500 bg-violet-500/15 text-violet-300"
                    : "border-border text-muted-foreground hover:border-violet-500/40"
                }`}
              >
                {tone.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || (!formData.role && !formData.jobDescription)}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Generate Email
          </>
        )}
      </button>

      {/* Generated Output */}
      {generated && (
        <div className="space-y-3 pt-2 border-t border-violet-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-violet-300">Generated Email</span>
            <div className="flex items-center gap-2">
              <button onClick={handleCopy} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="rounded-lg border bg-background p-3 text-sm whitespace-pre-wrap leading-relaxed">
            {generated}
          </div>
          <button
            onClick={handleUse}
            className="w-full rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/20 transition-colors"
          >
            Use This Email as Template Body
          </button>
        </div>
      )}
    </div>
  );
}
