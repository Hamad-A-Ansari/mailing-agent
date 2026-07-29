"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { Plus, Trash2, ExternalLink, GripVertical } from "lucide-react";
import type { Application, ApplicationStage } from "@/types/database";

const STAGES: ApplicationStage[] = [
  "Saved",
  "Applied",
  "OA",
  "Phone Screen",
  "Technical Interview",
  "Final Round",
  "Offer",
  "Rejected",
  "Accepted",
];

const stageColors: Record<ApplicationStage, string> = {
  Saved: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  Applied: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  OA: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Phone Screen": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Technical Interview": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Final Round": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  Offer: "bg-green-500/10 text-green-400 border-green-500/20",
  Rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  Accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [formData, setFormData] = useState({
    job_title: "",
    company: "",
    stage: "Saved" as ApplicationStage,
    job_url: "",
    notes: "",
    location: "",
  });

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/applications");
    if (res.ok) {
      const data = await res.json();
      setApplications(data.applications || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleAdd = async () => {
    if (!formData.job_title.trim() || !formData.company.trim()) return;

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      toast.add({ title: "Application added", type: "success" });
      setAddOpen(false);
      resetForm();
      fetchApplications();
    }
  };

  const handleUpdate = async () => {
    if (!editApp) return;

    const res = await fetch(`/api/applications/${editApp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      toast.add({ title: "Application updated", type: "success" });
      setEditApp(null);
      resetForm();
      fetchApplications();
    }
  };

  const handleStageChange = async (id: string, newStage: ApplicationStage) => {
    // Optimistic update
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, stage: newStage } : app))
    );

    const res = await fetch(`/api/applications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });

    if (!res.ok) {
      fetchApplications(); // Rollback
      toast.add({ title: "Failed to update stage", type: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this application?")) return;
    await fetch(`/api/applications/${id}`, { method: "DELETE" });
    toast.add({ title: "Application deleted", type: "success" });
    fetchApplications();
  };

  const resetForm = () => {
    setFormData({ job_title: "", company: "", stage: "Saved", job_url: "", notes: "", location: "" });
  };

  const openEdit = (app: Application) => {
    setFormData({
      job_title: app.job_title,
      company: app.company,
      stage: app.stage,
      job_url: app.job_url || "",
      notes: app.notes || "",
      location: app.location || "",
    });
    setEditApp(app);
  };

  const getStageApps = (stage: ApplicationStage) =>
    applications.filter((app) => app.stage === stage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground">
            Track your job applications across stages.
          </p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setAddOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" />
          Add Application
        </Button>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`skeleton-col-${i}`} className="min-w-[280px] space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageApps = getStageApps(stage);
            return (
              <div key={stage} className="min-w-[280px] max-w-[280px] flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{stage}</h3>
                    <Badge variant="secondary" className="text-[10px]">
                      {stageApps.length}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 min-h-[100px] rounded-lg bg-muted/30 p-2">
                  {stageApps.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      No applications
                    </p>
                  ) : (
                    stageApps.map((app) => (
                      <Card
                        key={app.id}
                        className="cursor-pointer hover:border-primary/30 transition-colors"
                        onClick={() => openEdit(app)}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{app.job_title}</p>
                              <p className="text-xs text-muted-foreground">{app.company}</p>
                            </div>
                            <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          </div>
                          {app.location && (
                            <p className="text-[10px] text-muted-foreground">{app.location}</p>
                          )}
                          {app.job_url && (
                            <a
                              href={app.job_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                            >
                              View posting <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen || !!editApp} onOpenChange={(open) => { if (!open) { setAddOpen(false); setEditApp(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editApp ? "Edit Application" : "Add Application"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Title *</label>
              <Input
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Company *</label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="e.g. Stripe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stage</label>
              <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v as ApplicationStage })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Bangalore, India"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Job URL</label>
              <Input
                value={formData.job_url}
                onChange={(e) => setFormData({ ...formData, job_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any notes..."
              />
            </div>
            <div className="flex justify-between">
              {editApp && (
                <Button variant="destructive" size="sm" onClick={() => { handleDelete(editApp.id); setEditApp(null); }}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => { setAddOpen(false); setEditApp(null); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={editApp ? handleUpdate : handleAdd} disabled={!formData.job_title.trim() || !formData.company.trim()}>
                  {editApp ? "Update" : "Add"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
