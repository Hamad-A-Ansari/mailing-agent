"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/components/ui/kanban";
import { toast } from "@/components/ui/toast";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
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
  Saved: "bg-gray-500",
  Applied: "bg-blue-500",
  OA: "bg-purple-500",
  "Phone Screen": "bg-cyan-500",
  "Technical Interview": "bg-orange-500",
  "Final Round": "bg-pink-500",
  Offer: "bg-green-500",
  Rejected: "bg-red-500",
  Accepted: "bg-emerald-500",
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

  // Build columns data for the Kanban component
  const columns = STAGES.reduce((acc, stage) => {
    acc[stage] = applications.filter((app) => app.stage === stage);
    return acc;
  }, {} as Record<string, Application[]>);

  const handleKanbanChange = async (newColumns: Record<string, Application[]>) => {
    // Find which app changed stage
    for (const [stage, apps] of Object.entries(newColumns)) {
      for (const app of apps) {
        if (app.stage !== stage) {
          // Stage changed — update server
          await fetch(`/api/applications/${app.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage }),
          });
        }
      }
    }

    // Update local state
    const allApps = Object.entries(newColumns).flatMap(([stage, apps]) =>
      apps.map((app) => ({ ...app, stage: stage as ApplicationStage }))
    );
    setApplications(allApps);
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground">
            Track your job applications. Drag cards between stages.
          </p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setAddOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" />
          Add Application
        </Button>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex gap-3 overflow-hidden pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`skeleton-col-${i}`} className="min-w-[240px] space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-none pb-2">
          <Kanban
            value={columns}
            onValueChange={handleKanbanChange}
            getItemValue={(item) => item.id}
          >
            <KanbanBoard className="flex gap-3">
              {STAGES.map((stage) => (
                <KanbanColumn key={stage} value={stage} className="min-w-[240px] max-w-[240px] shrink-0">
                  <div className="flex flex-col rounded-lg bg-muted/40 border border-border/50 p-2 h-full">
                    <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                      <span className={cn("h-2 w-2 rounded-full", stageColors[stage])} />
                      <h3 className="text-xs font-semibold">{stage}</h3>
                      <Badge variant="secondary" className="text-[10px] ml-auto">
                        {columns[stage]?.length || 0}
                      </Badge>
                    </div>
                    <KanbanColumnContent value={stage} className="flex flex-col gap-2 min-h-[80px]">
                      {(columns[stage] || []).map((app) => (
                        <KanbanItem key={app.id} value={app.id}>
                          <KanbanItemHandle>
                            <div
                              className="bg-background rounded-md border p-2.5 shadow-xs cursor-grab hover:border-primary/30 transition-colors active:cursor-grabbing"
                              onClick={() => openEdit(app)}
                            >
                              <p className="text-xs font-medium truncate">{app.job_title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{app.company}</p>
                              {app.location && (
                                <p className="text-[10px] text-muted-foreground">{app.location}</p>
                              )}
                              {app.job_url && (
                                <a
                                  href={app.job_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5 mt-1"
                                >
                                  View posting <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          </KanbanItemHandle>
                        </KanbanItem>
                      ))}
                    </KanbanColumnContent>
                  </div>
                </KanbanColumn>
              ))}
            </KanbanBoard>
            <KanbanOverlay>
              {({ value }) => {
                const activeValue = String(value);
                const app = applications.find((a) => a.id === activeValue);
                if (!app) return null;
                return (
                  <div className="bg-background rounded-md border p-2.5 shadow-lg rotate-2">
                    <p className="text-xs font-medium truncate">{app.job_title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{app.company}</p>
                  </div>
                );
              }}
            </KanbanOverlay>
          </Kanban>
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
