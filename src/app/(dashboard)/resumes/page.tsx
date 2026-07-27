"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Star, FileText } from "lucide-react";
import type { Resume } from "@/types/database";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResumes = useCallback(async () => {
    const res = await fetch("/api/resumes");
    if (res.ok) {
      const data = await res.json();
      setResumes(data.resumes || []);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds 5MB limit.");
      return;
    }

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/resumes", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      await fetchResumes();
    } else {
      const data = await res.json();
      setError(data.error || "Upload failed.");
    }

    setUploading(false);
    // Reset the input
    e.target.value = "";
  };

  const handleSetDefault = async (id: string) => {
    await fetch(`/api/resumes/${id}`, { method: "PUT" });
    fetchResumes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resume?")) return;
    await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    fetchResumes();
  };

  const defaultResume = resumes.find((r) => r.is_default);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resumes</h1>
        <p className="text-muted-foreground">
          Upload PDF resumes to attach to outreach emails. The default resume is automatically attached when sending.
        </p>
      </div>

      {/* Upload area */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload PDF"}
            </label>
            <p className="text-xs text-muted-foreground">
              PDF only, max 5MB
            </p>
          </div>
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Current default */}
      {defaultResume && (
        <div className="flex items-center gap-2 text-sm">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="text-muted-foreground">Default attachment:</span>
          <span className="font-medium">{defaultResume.filename}</span>
        </div>
      )}

      {/* Resume list */}
      <div className="space-y-2">
        {resumes.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">
            No resumes uploaded yet. Upload a PDF above.
          </p>
        ) : (
          resumes.map((resume) => (
            <Card key={resume.id} className={resume.is_default ? "border-yellow-500/30" : ""}>
              <CardContent className="flex items-center gap-4 py-4">
                <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{resume.filename}</p>
                    {resume.is_default && (
                      <Badge variant="secondary" className="shrink-0 text-yellow-600 bg-yellow-500/10">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(resume.file_size)} · Uploaded {new Date(resume.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
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
    </div>
  );
}
