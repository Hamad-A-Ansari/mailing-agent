"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";
import type { SubjectLine } from "@/types/database";

export default function SubjectLinesPage() {
  const [subjectLines, setSubjectLines] = useState<SubjectLine[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchSubjectLines = useCallback(async () => {
    const res = await fetch("/api/subject-lines");
    if (res.ok) {
      const data = await res.json();
      setSubjectLines(data.subjectLines);
      setActiveCount(data.activeCount);
      setTotalCount(data.totalCount);
    }
  }, []);

  useEffect(() => {
    fetchSubjectLines();
  }, [fetchSubjectLines]);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    setLoading(true);
    await fetch("/api/subject-lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText }),
    });
    setNewText("");
    await fetchSubjectLines();
    setLoading(false);
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

      {/* Add form */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Enter a new subject line..."
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={loading || !newText.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active count */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-sm">
          {activeCount} of {totalCount} active
        </Badge>
      </div>

      {/* Subject line list */}
      <div className="space-y-2">
        {subjectLines.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No subject lines yet. Add one above.
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
    </div>
  );
}
