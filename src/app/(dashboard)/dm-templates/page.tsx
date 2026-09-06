"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
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
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  MessageSquare,
} from "lucide-react";

interface DmTemplate {
  id: string;
  name: string;
  category: string;
  body: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "connection", label: "Connection Request" },
  { value: "inmail", label: "InMail" },
  { value: "follow-up", label: "Follow-up" },
  { value: "referral", label: "Referral" },
] as const;

// Variables the extension fills from a LinkedIn profile
const VARIABLES = [
  { key: "name", label: "Full Name" },
  { key: "firstName", label: "First Name" },
  { key: "company", label: "Company" },
  { key: "title", label: "Title" },
  { key: "role", label: "Role" },
];

const categoryColors: Record<string, string> = {
  connection: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  inmail: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "follow-up": "bg-violet-500/15 text-violet-400 border-violet-500/30",
  referral: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

export default function DmTemplatesPage() {
  const [templates, setTemplates] = useState<DmTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DmTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<string>("connection");
  const [formBody, setFormBody] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?category=${filter}` : "";
      const res = await fetch(`/api/dm-templates${params}`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormCategory("connection");
    setFormBody("");
    setDialogOpen(true);
  };

  const openEdit = (t: DmTemplate) => {
    setEditing(t);
    setFormName(t.name);
    setFormCategory(t.category);
    setFormBody(t.body);
    setDialogOpen(true);
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    const insertion = `{{${variable}}}`;
    if (!textarea) {
      setFormBody((prev) => prev + insertion);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = formBody.substring(0, start) + insertion + formBody.substring(end);
    setFormBody(newBody);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertion.length, start + insertion.length);
    }, 0);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formBody.trim()) {
      toast.add({ title: "Name and body are required", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/dm-templates/${editing.id}` : "/api/dm-templates";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, category: formCategory, body: formBody }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      toast.add({ title: editing ? "Template updated" : "Template created", type: "success" });
      setDialogOpen(false);
      fetchTemplates();
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Failed to save", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    const res = await fetch(`/api/dm-templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.add({ title: "Template deleted", type: "success" });
    } else {
      toast.add({ title: "Failed to delete", type: "error" });
      fetchTemplates();
    }
  };

  const handleCopy = async (t: DmTemplate) => {
    try {
      await navigator.clipboard.writeText(t.body);
      setCopiedId(t.id);
      toast.add({ title: "Copied to clipboard", type: "success" });
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.add({ title: "Copy failed", type: "error" });
    }
  };

  const categoryLabel = (v: string) =>
    CATEGORIES.find((c) => c.value === v)?.label || v;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-emerald-400" />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              LinkedIn DM Templates
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reusable message templates for LinkedIn outreach. Use them from the
            browser extension on any profile.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v || "all")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Template List */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground mb-4">
            No DM templates yet. Create one to use from the extension.
          </p>
          <Button onClick={openCreate} variant="outline" className="gap-1.5">
            <Plus className="h-4 w-4" /> Create your first template
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border bg-card p-4 flex flex-col gap-3 hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-medium text-sm truncate">{t.name}</h3>
                  <Badge
                    variant="outline"
                    className={`mt-1 text-[10px] ${categoryColors[t.category] || ""}`}
                  >
                    {categoryLabel(t.category)}
                  </Badge>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(t)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                    title="Copy body"
                  >
                    {copiedId === t.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6 leading-relaxed">
                {t.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit DM Template" : "Create DM Template"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Recruiter connection request"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v || "connection")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message *</label>
              <div className="flex flex-wrap gap-1">
                {VARIABLES.map((v) => (
                  <Badge
                    key={v.key}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/20 text-xs"
                    onClick={() => insertVariable(v.key)}
                    title={`Insert ${v.label}`}
                  >
                    {`{{${v.key}}}`}
                  </Badge>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder="Hi {{firstName}}, I came across your profile at {{company}}..."
                className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
              <p className="text-[11px] text-muted-foreground">
                Click a variable to insert it. The extension replaces these with
                the recruiter&apos;s details from their LinkedIn profile.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
