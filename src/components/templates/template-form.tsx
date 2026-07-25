"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { templateVariables } from "@/lib/email/template-engine";
import type { EmailTemplate } from "@/types/database";
import { useRef } from "react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["outreach", "follow-up", "referral"]),
  body: z.string().min(1, "Body is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface TemplateFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => Promise<void>;
  template?: EmailTemplate;
  defaultCategory?: string;
}

export function TemplateForm({
  open,
  onClose,
  onSubmit,
  template,
  defaultCategory,
}: TemplateFormProps) {
  const isEdit = !!template;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: template
      ? { name: template.name, category: template.category, body: template.body }
      : { name: "", category: (defaultCategory as FormValues["category"]) || "outreach", body: "" },
  });

  const { ref: bodyRef, ...bodyRegister } = form.register("body");

  const handleSubmit = async (data: FormValues) => {
    await onSubmit(data);
    form.reset();
    onClose();
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentBody = form.getValues("body");
    const insertion = `\${${variable}}`;
    const newBody =
      currentBody.substring(0, start) + insertion + currentBody.substring(end);
    form.setValue("body", newBody);

    // Restore cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + insertion.length,
        start + insertion.length
      );
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Template" : "Create Template"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name *</label>
            <Input {...form.register("name")} placeholder="Template name" />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category *</label>
            <Select
              value={form.watch("category")}
              onValueChange={(v) =>
                form.setValue("category", v as FormValues["category"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outreach">Outreach</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Body *</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {templateVariables.map((v) => (
                <Badge
                  key={v.key}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary/20"
                  onClick={() => insertVariable(v.key)}
                >
                  {`\${${v.key}}`}
                </Badge>
              ))}
            </div>
            <textarea
              {...bodyRegister}
              ref={(e) => {
                bodyRef(e);
                textareaRef.current = e;
              }}
              placeholder="Write your email template body..."
              className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {form.formState.errors.body && (
              <p className="text-xs text-destructive">
                {form.formState.errors.body.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? "Saving..."
                : isEdit
                  ? "Update"
                  : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
