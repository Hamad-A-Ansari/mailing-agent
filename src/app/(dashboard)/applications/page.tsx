"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import { toast } from "@/components/ui/toast";
import { Plus, Trash2, ExternalLink, ArrowRight, CalendarIcon, Pencil, MoveRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { format } from "date-fns";
import type { Application, ApplicationStage, ApplicationPriority, ApplicationHistory } from "@/types/database";

const STAGES: ApplicationStage[] = [
  "Saved", "Applied", "OA", "Phone Screen",
  "Technical Interview", "Final Round", "Offer", "Rejected", "Accepted",
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

const priorityColors: Record<ApplicationPriority, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-rose-500",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [detailHistory, setDetailHistory] = useState<ApplicationHistory[]>([]);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; company: string }>>([]);
  const [resumes, setResumes] = useState<Array<{ id: string; display_name: string | null; filename: string }>>([]);
  const [formData, setFormData] = useState({
    job_title: "",
    company: "",
    stage: "Saved" as ApplicationStage,
    priority: "medium" as ApplicationPriority,
    job_url: "",
    notes: "",
    location: "",
    resume_id: null as string | null,
    contact_id: null as string | null,
    interview_date: "",
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
    // Fetch contacts and resumes for linking
    fetch("/api/recruiters?pageSize=1000").then(r => r.json()).then(data => {
      setContacts((data.recruiters || []).map((r: { id: string; name: string; company: string }) => ({ id: r.id, name: r.name, company: r.company })));
    });
    fetch("/api/resumes").then(r => r.json()).then(data => {
      setResumes((data.resumes || []).map((r: { id: string; display_name: string | null; filename: string }) => ({ id: r.id, display_name: r.display_name, filename: r.filename })));
    });
  }, [fetchApplications]);

  // Build columns for Kanban
  const columns = STAGES.reduce((acc, stage) => {
    acc[stage] = applications.filter((app) => app.stage === stage);
    return acc;
  }, {} as Record<string, Application[]>);

  const handleKanbanChange = (newColumns: Record<string, Application[]>) => {
    const allApps = Object.entries(newColumns).flatMap(([stage, apps]) =>
      apps.map((app) => ({ ...app, stage: stage as ApplicationStage }))
    );
    setApplications(allApps);

    // Persist stage changes
    for (const [stage, apps] of Object.entries(newColumns)) {
      for (const app of apps) {
        if (app.stage !== stage) {
          fetch(`/api/applications/${app.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage }),
          });
        }
      }
    }
  };

  const handleAdd = async () => {
    if (!formData.job_title.trim() || !formData.company.trim()) return;
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        resume_id: formData.resume_id || null,
        contact_id: formData.contact_id || null,
        interview_date: formData.interview_date || null,
      }),
    });
    if (res.ok) {
      const newApp = await res.json();
      setApplications((prev) => [newApp, ...prev]);
      toast.add({ title: "Application added", type: "success" });
      setAddOpen(false);
      resetForm();
    }
  };

  const handleUpdateDetail = async (field: string, value: string | null) => {
    if (!detailApp) return;
    const update = { [field]: value };
    setDetailApp({ ...detailApp, [field]: value } as Application);
    // Update local applications state without refetch
    setApplications((prev) =>
      prev.map((app) => (app.id === detailApp.id ? { ...app, [field]: value } as Application : app))
    );
    await fetch(`/api/applications/${detailApp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
  };

  const handleDelete = async (id: string) => {
    // Optimistic remove — no refetch, no loading flash
    setApplications((prev) => prev.filter((app) => app.id !== id));
    setDetailApp(null);
    toast.add({ title: "Application deleted", type: "success" });
    
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (!res.ok) {
      // Rollback on failure
      fetchApplications();
      toast.add({ title: "Failed to delete", type: "error" });
    }
  };

  const openDetail = async (app: Application) => {
    setDetailApp(app);
    // Fetch history
    const res = await fetch(`/api/applications/${app.id}`);
    if (res.ok) {
      const data = await res.json();
      setDetailHistory(data.history || []);
    }
  };

  const resetForm = () => {
    setFormData({
      job_title: "", company: "", stage: "Saved", priority: "medium",
      job_url: "", notes: "", location: "", resume_id: null, contact_id: null, interview_date: "",
    });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const getContactName = (id: string | null) => contacts.find(c => c.id === id)?.name || null;
  const getResumeName = (id: string | null) => {
    const r = resumes.find(r => r.id === id);
    return r ? (r.display_name || r.filename) : null;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between mb-4">
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
        <ScrollArea className="w-full flex-1">
          <div className="pb-4 h-full">
            <Kanban
              value={columns}
              onValueChange={handleKanbanChange}
              getItemValue={(item) => item.id}
              className="h-full"
            >
              <KanbanBoard className="flex gap-3 h-full">
                {STAGES.map((stage) => (
                  <KanbanColumn key={stage} value={stage} className="min-w-[240px] max-w-[240px] shrink-0 h-full">
                    <div className="flex flex-col rounded-lg bg-muted/40 border border-border/50 p-2 h-full">
                      <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                        <span className={cn("h-2 w-2 rounded-full", stageColors[stage])} />
                        <h3 className="text-xs font-semibold">{stage}</h3>
                        <Badge variant="secondary" className="text-[10px] ml-auto">
                          {columns[stage]?.length || 0}
                        </Badge>
                      </div>
                      <KanbanColumnContent value={stage} className="flex flex-col gap-2 min-h-[80px] flex-1 overflow-y-auto scrollbar-none">
                        {(columns[stage] || []).map((app) => (
                          <KanbanItem key={app.id} value={app.id}>
                            <KanbanItemHandle>
                              <ContextMenu>
                                <ContextMenuTrigger>
                                  <div
                                    className="bg-background rounded-md border p-2.5 shadow-xs cursor-grab hover:border-primary/30 transition-colors active:cursor-grabbing"
                                    onClick={() => openDetail(app)}
                                  >
                                    {/* Priority dot + Title */}
                                    <div className="flex items-start gap-2">
                                      <span className={cn("mt-1 h-2 w-2 rounded-full shrink-0", priorityColors[app.priority || "medium"])} />
                                      <p className="text-xs font-medium truncate">{app.job_title}</p>
                                    </div>
                                    {/* Company with logo */}
                                    <div className="flex items-center gap-1.5 mt-1 ml-4">
                                      <img
                                        src={`https://www.google.com/s2/favicons?domain=${app.company.toLowerCase().replace(/\s+/g, "")}.com&sz=16`}
                                        alt=""
                                        className="h-3 w-3 rounded-sm"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                      />
                                      <p className="text-[10px] text-muted-foreground">{app.company}</p>
                                    </div>
                                    {/* Badges row */}
                                    <div className="flex flex-wrap items-center gap-1 mt-1.5 ml-4">
                                      {app.applied_at && (
                                        <span className="text-[9px] text-muted-foreground">{timeAgo(app.applied_at)}</span>
                                      )}
                                      {!app.applied_at && app.created_at && (
                                        <span className="text-[9px] text-muted-foreground">{timeAgo(app.created_at)}</span>
                                      )}
                                      {app.resume_id && (
                                        <Badge variant="secondary" className="text-[8px] px-1 py-0">
                                          {getResumeName(app.resume_id)?.substring(0, 12) || "Resume"}
                                        </Badge>
                                      )}
                                      {app.contact_id && (
                                        <Badge variant="secondary" className="text-[8px] px-1 py-0">
                                          {getContactName(app.contact_id)?.split(" ")[0] || "Contact"}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem onClick={() => openDetail(app)}>
                                    <Pencil className="mr-2 h-3.5 w-3.5" />
                                    Edit
                                  </ContextMenuItem>
                                  <ContextMenuSub>
                                    <ContextMenuSubTrigger>
                                      <MoveRight className="mr-2 h-3.5 w-3.5" />
                                      Move to
                                    </ContextMenuSubTrigger>
                                    <ContextMenuSubContent>
                                      {STAGES.filter((s) => s !== app.stage).map((s) => (
                                        <ContextMenuItem
                                          key={s}
                                          onClick={() => {
                                            handleKanbanChange({
                                              ...columns,
                                              [app.stage]: columns[app.stage].filter((a) => a.id !== app.id),
                                              [s]: [...(columns[s] || []), { ...app, stage: s }],
                                            });
                                            fetch(`/api/applications/${app.id}`, {
                                              method: "PUT",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ stage: s }),
                                            });
                                            toast.add({ title: `Moved to ${s}`, type: "success" });
                                          }}
                                        >
                                          <span className={cn("mr-2 h-2 w-2 rounded-full inline-block", stageColors[s])} />
                                          {s}
                                        </ContextMenuItem>
                                      ))}
                                    </ContextMenuSubContent>
                                  </ContextMenuSub>
                                  <ContextMenuSeparator />
                                  <ContextMenuItem className="text-destructive" onClick={() => handleDelete(app.id)}>
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    Delete
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>
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
                  const app = applications.find((a) => a.id === String(value));
                  if (!app) return null;
                  return (
                    <div className="bg-background rounded-md border p-2.5 shadow-lg rotate-2 w-[230px]">
                      <div className="flex items-start gap-2">
                        <span className={cn("mt-1 h-2 w-2 rounded-full shrink-0", priorityColors[app.priority || "medium"])} />
                        <p className="text-xs font-medium truncate">{app.job_title}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground ml-4 mt-0.5">{app.company}</p>
                    </div>
                  );
                }}
              </KanbanOverlay>
            </Kanban>
          </div>
          <ScrollBar orientation="horizontal" className="m-1" />
        </ScrollArea>
      )}

      {/* Detail Sheet (Right Drawer) */}
      <Sheet open={!!detailApp} onOpenChange={(open) => { if (!open) setDetailApp(null); }}>
        <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto scrollbar-none">
          {detailApp && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <SheetHeader className="pb-6 border-b mb-6">
                <div className="flex items-center gap-3">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${detailApp.company.toLowerCase().replace(/\s+/g, "")}.com&sz=32`}
                    alt=""
                    className="h-8 w-8 rounded-lg bg-muted p-1"
                    onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='%23666' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='4'/%3E%3C/svg%3E"; }}
                  />
                  <div>
                    <SheetTitle className="text-lg leading-tight">{detailApp.job_title}</SheetTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">{detailApp.company}{detailApp.location ? ` · ${detailApp.location}` : ""}</p>
                  </div>
                </div>
                {detailApp.job_url && (
                  <a href={detailApp.job_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-2">
                    View job posting <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </SheetHeader>

              <div className="space-y-6 flex-1">
                {/* Status Section */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground">Stage</label>
                      <Select value={detailApp.stage} onValueChange={(v) => { handleUpdateDetail("stage", v); setDetailApp({ ...detailApp, stage: v as ApplicationStage }); }}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground">Priority</label>
                      <Select value={detailApp.priority || "medium"} onValueChange={(v) => { handleUpdateDetail("priority", v); setDetailApp({ ...detailApp, priority: v as ApplicationPriority }); }}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground">Interview Date</label>
                    <Popover>
                      <PopoverTrigger>
                        <Button variant="outline" className={cn("w-full h-9 text-sm justify-start font-normal", !detailApp.interview_date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {detailApp.interview_date ? format(new Date(detailApp.interview_date), "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={detailApp.interview_date ? new Date(detailApp.interview_date) : undefined}
                          onSelect={(date) => {
                            const val = date ? date.toISOString() : null;
                            handleUpdateDetail("interview_date", val);
                            setDetailApp({ ...detailApp, interview_date: val });
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Links Section */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connections</h4>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground">Linked Contact</label>
                      <Select value={detailApp.contact_id || "none"} onValueChange={(v) => { const val = v === "none" ? null : v; handleUpdateDetail("contact_id", val); setDetailApp({ ...detailApp, contact_id: val }); }}>
                        <SelectTrigger className="h-9">
                          <SelectValue>{getContactName(detailApp.contact_id) || "None"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {contacts.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name} ({c.company})</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground">Resume Used</label>
                      <Select value={detailApp.resume_id || "none"} onValueChange={(v) => { const val = v === "none" ? null : v; handleUpdateDetail("resume_id", val); setDetailApp({ ...detailApp, resume_id: val }); }}>
                        <SelectTrigger className="h-9">
                          <SelectValue>{getResumeName(detailApp.resume_id) || "None"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {resumes.map((r) => (<SelectItem key={r.id} value={r.id}>{r.display_name || r.filename}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h4>
                  <Textarea
                    className="text-sm min-h-[120px] resize-none bg-muted/30 border"
                    placeholder="Add notes about this application..."
                    value={detailApp.notes || ""}
                    onChange={(e) => setDetailApp({ ...detailApp, notes: e.target.value })}
                    onBlur={() => handleUpdateDetail("notes", detailApp.notes)}
                  />
                </div>

                {/* Activity Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity</h4>
                  {detailHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No activity yet. Stage changes will appear here.</p>
                  ) : (
                    <Timeline defaultValue={detailHistory.length}>
                      {detailHistory.map((h, idx) => (
                        <TimelineItem key={h.id} step={idx + 1} className="group-data-[orientation=vertical]/timeline:ms-8">
                          <TimelineHeader>
                            <TimelineSeparator className="bg-input! group-data-[orientation=vertical]/timeline:-left-5 group-data-[orientation=vertical]/timeline:h-[calc(100%-1rem)] group-data-[orientation=vertical]/timeline:translate-y-5" />
                            <TimelineIndicator className="flex size-4 items-center justify-center border-none group-data-[orientation=vertical]/timeline:-left-5 bg-primary/20">
                              <ArrowRight className="size-2.5 text-primary" />
                            </TimelineIndicator>
                            <TimelineTitle className="text-[11px]">
                              {h.from_stage} → {h.to_stage}
                            </TimelineTitle>
                          </TimelineHeader>
                          <TimelineContent>
                            <TimelineDate className="text-[10px]">{timeAgo(h.created_at)}</TimelineDate>
                          </TimelineContent>
                        </TimelineItem>
                      ))}
                    </Timeline>
                  )}
                </div>

                {/* Delete */}
                <div className="pt-4 border-t">
                  <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDelete(detailApp.id)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete Application
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Job Title *</label>
                <Input value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })} placeholder="Software Engineer" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Company *</label>
                <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="Stripe" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Stage</label>
                <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v as ApplicationStage })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Priority</label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as ApplicationPriority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Bangalore, India" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Job URL</label>
              <Input value={formData.job_url} onChange={(e) => setFormData({ ...formData, job_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Resume</label>
                <Select value={formData.resume_id || "none"} onValueChange={(v) => setFormData({ ...formData, resume_id: v === "none" ? null : v })}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue>
                      {formData.resume_id ? getResumeName(formData.resume_id) || "Select..." : "None"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {resumes.map((r) => (<SelectItem key={r.id} value={r.id}>{r.display_name || r.filename}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Contact</label>
                <Select value={formData.contact_id || "none"} onValueChange={(v) => setFormData({ ...formData, contact_id: v === "none" ? null : v })}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue>
                      {formData.contact_id ? getContactName(formData.contact_id) || "Select..." : "None"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {contacts.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Any notes..." className="min-h-[60px]" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!formData.job_title.trim() || !formData.company.trim()}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
