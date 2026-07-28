"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Trash2, Star, FileText, Sparkles, X, Plus } from "lucide-react";
import { toast } from "@/components/ui/toast";
import type { Resume } from "@/types/database";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface GradeResult {
  score: number;
  summary: string;
  sections: {
    formatting: { score: number; feedback: string };
    content: { score: number; feedback: string };
    keywords: { score: number; feedback: string };
    experience: { score: number; feedback: string };
    atsCompatibility: { score: number; feedback: string };
  };
  strengths: string[];
  improvements: string[];
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [grading, setGrading] = useState<string | null>(null);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/resumes");
    if (res.ok) {
      const data = await res.json();
      setResumes(data.resumes || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) return;

    if (uploadFile.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.");
      return;
    }
    if (uploadFile.size > 5 * 1024 * 1024) {
      setUploadError("File exceeds 5MB limit.");
      return;
    }

    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("display_name", uploadName.trim());

    const res = await fetch("/api/resumes", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      await fetchResumes();
      setUploadOpen(false);
      setUploadName("");
      setUploadFile(null);
      toast.add({ title: "Resume uploaded", type: "success" });
    } else {
      setUploadError("Failed to upload resume. Please try again.");
    }

    setUploading(false);
  };

  const handleSetDefault = async (id: string) => {
    await fetch(`/api/resumes/${id}`, { method: "PUT" });
    toast.add({ title: "Default resume updated", type: "success" });
    fetchResumes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resume?")) return;
    await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    toast.add({ title: "Resume deleted", type: "success" });
    fetchResumes();
  };

  const handleGrade = async (id: string) => {
    setGrading(id);
    setGradeResult(null);
    setGradeError(null);

    const res = await fetch(`/api/resumes/${id}/grade`, { method: "POST" });

    if (res.ok) {
      const data = await res.json();
      setGradeResult(data);
    } else {
      setGradeError("Failed to grade resume. Please try again.");
    }

    setGrading(null);
  };

  const defaultResume = resumes.find((r) => r.is_default);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resumes</h1>
        <p className="text-muted-foreground">
          Upload PDF resumes to attach to outreach emails. Grade them with AI to improve your chances.
        </p>
      </div>

      {/* Header with default info + upload button */}
      <div className="flex items-center justify-between">
        {defaultResume ? (
          <div className="flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-muted-foreground">Default:</span>
            <span className="font-medium">{defaultResume.display_name || defaultResume.filename}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No default resume set</span>
        )}
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Upload Resume
        </Button>
      </div>

      {/* Resume list */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={`skeleton-${i}`}>
              <CardContent className="flex items-center gap-4 py-4">
                <Skeleton className="h-8 w-8" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </CardContent>
            </Card>
          ))
        ) : resumes.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">
            No resumes uploaded yet. Click "Upload Resume" to add one.
          </p>
        ) : (
          resumes.map((resume) => (
            <Card key={resume.id} className={resume.is_default ? "border-yellow-500/30" : ""}>
              <CardContent className="flex items-center gap-4 py-4">
                <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {resume.display_name || resume.filename}
                    </p>
                    {resume.is_default && (
                      <Badge variant="secondary" className="shrink-0 text-yellow-600 bg-yellow-500/10">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {resume.display_name ? resume.filename + " · " : ""}{formatFileSize(resume.file_size)} · Uploaded {new Date(resume.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGrade(resume.id)}
                    disabled={grading === resume.id}
                    title="Grade with AI"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    {grading === resume.id ? "..." : "Grade"}
                  </Button>
                  {!resume.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(resume.id)}
                      title="Set as default"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(resume.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Grade error */}
      {gradeError && (
        <Card className="border-destructive/30">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{gradeError}</p>
          </CardContent>
        </Card>
      )}

      {/* Grade Results */}
      {gradeResult && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Resume Grade</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setGradeResult(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <span className={`text-5xl font-bold ${getScoreColor(gradeResult.score)}`}>
                {gradeResult.score}
              </span>
              <span className="text-2xl text-muted-foreground">/100</span>
              <p className="text-sm text-muted-foreground mt-2">{gradeResult.summary}</p>
            </div>

            <div className="space-y-4">
              {Object.entries(gradeResult.sections).map(([key, section]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize font-medium">
                      {key === "atsCompatibility" ? "ATS Compatibility" : key}
                    </span>
                    <span className={getScoreColor(section.score)}>{section.score}/100</span>
                  </div>
                  <Progress value={section.score} className="h-2" />
                  <p className="text-xs text-muted-foreground">{section.feedback}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium mb-2 text-green-500">Strengths</h4>
                <ul className="space-y-1">
                  {gradeResult.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1">
                      <span className="text-green-500">+</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2 text-yellow-500">Improvements</h4>
                <ul className="space-y-1">
                  {gradeResult.improvements.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1">
                      <span className="text-yellow-500">→</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Resume</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Resume Name *</label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g. SDE Resume, Frontend Resume"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">PDF File *</label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Upload className="mr-2 h-4 w-4" />
                  Choose File
                </label>
                <span className="text-sm text-muted-foreground truncate">
                  {uploadFile ? uploadFile.name : "No file chosen"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">PDF only, max 5MB</p>
            </div>
            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setUploadOpen(false); setUploadFile(null); setUploadName(""); setUploadError(null); }}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !uploadFile || !uploadName.trim()}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
