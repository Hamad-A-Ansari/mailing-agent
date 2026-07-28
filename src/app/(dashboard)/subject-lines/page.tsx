"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";
import { toast } from "@/components/ui/toast";
import type { SubjectLine } from "@/types/database";

export default function SubjectLinesPage() {
  const [subjectLines, setSubjectLines] = useState<SubjectLine[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchSubjectLines = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/subject-lines");
    if (res.ok) {
      const data = await res.json();
      setSubjectLines(data.subjectLines);
      setActiveCount(data.activeCount);
      setTotalCount(data.totalCount);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubjectLines();
  }, [fetchSubjectLines]);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    setSubmitting(true);
    await fetch("/api/subject-lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText }),
    });
    setNewText("");
    setAddOpen(false);
    setSubmitting(false);
    toast.add({ title: "Subject line added", type: "success" });
    fetchSubjectLines();
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    await fetch(`/api/subject-lines/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !currentActive }),
    });
    fetchSubjectLines();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subject line?")) return;
    await fetch(`/api/subject-lines/${id}`, { method: "DELETE" });
    toast.add({ title: "Subject line deleted", type: "success" });
    fetchSubjectLines();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subject Lines</h1>
        <p className="text-muted-foreground">
          Manage your subject line pool. Active lines are randomly assigned during sends.
        </p>
      </div>

      {/* Header with count + add button */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-sm">
          {activeCount} of {totalCount} active
        </Badge>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Add Subject Line
        </Button>
      </div>

      {/* Subject line list */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={`skeleton-${i}`}>
              <CardContent className="flex items-center gap-4 py-3">
                <Skeleton className="h-5 w-10 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-7 w-7" />
              </CardContent>
            </Card>
          ))
        ) : subjectLines.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">
            No subject lines yet. Click "Add Subject Line" to create one.
          </p>
        ) : (
          subjectLines.map((sl) => (
            <Card key={sl.id} className={!sl.is_active ? "opacity-60" : ""}>
              <CardContent className="flex items-center gap-4 py-3">
                <Switch
                  checked={sl.is_active}
                  onCheckedChange={() => handleToggle(sl.id, sl.is_active)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sl.text}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  Used {sl.usage_count}×
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(sl.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subject Line</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject Line *</label>
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g. Your Next Best Hire"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={submitting || !newText.trim()}>
                {submitting ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
