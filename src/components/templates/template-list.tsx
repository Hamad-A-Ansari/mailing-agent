"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { TemplateForm } from "./template-form";
import { TemplatePreview } from "./template-preview";
import type { EmailTemplate, TemplateCategory } from "@/types/database";

export function TemplateList() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<TemplateCategory>("outreach");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/templates");
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filtered = templates.filter((t) => t.category === activeTab);

  const handleCreate = async (data: Record<string, unknown>) => {
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    toast.add({ title: "Template created", type: "success" });
    fetchTemplates();
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editingTemplate) return;
    await fetch(`/api/templates/${editingTemplate.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setEditingTemplate(undefined);
    toast.add({ title: "Template updated", type: "success" });
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    toast.add({ title: "Template deleted", type: "success" });
    fetchTemplates();
  };

  const getCategoryCount = (cat: TemplateCategory) =>
    templates.filter((t) => t.category === cat).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateCategory)}>
          <TabsList>
            <TabsTrigger value="outreach">
              Outreach ({getCategoryCount("outreach")})
            </TabsTrigger>
            <TabsTrigger value="follow-up">
              Follow-up ({getCategoryCount("follow-up")})
            </TabsTrigger>
            <TabsTrigger value="referral">
              Referral ({getCategoryCount("referral")})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => { setEditingTemplate(undefined); setFormOpen(true); }} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground col-span-2 text-center py-8">
            No templates in this category yet.
          </p>
        ) : (
          filtered.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTemplate(template);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                  {template.body.substring(0, 150)}
                  {template.body.length > 150 && "..."}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={() =>
                    setExpandedId(expandedId === template.id ? null : template.id)
                  }
                >
                  {expandedId === template.id ? "Hide preview" : "Show preview"}
                </Button>
                {expandedId === template.id && (
                  <div className="mt-2">
                    <TemplatePreview body={template.body} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <TemplateForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTemplate(undefined); }}
        onSubmit={editingTemplate ? handleEdit : handleCreate}
        template={editingTemplate}
        defaultCategory={activeTab}
      />
    </div>
  );
}
