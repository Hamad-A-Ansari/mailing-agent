"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Trash2 } from "lucide-react";
import type { Recruiter, RecruiterEmail } from "@/types/database";

const emailSchema = z.object({
  email: z.string().email("Invalid email"),
  type: z.string(),
  is_primary: z.boolean(),
});

const CONTACT_ROLES = [
  "Recruiter",
  "Software Developer",
  "Engineering Manager",
  "Hiring Manager",
  "Director",
  "VP",
  "Talent Sourcer",
  "Other",
] as const;

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().min(1, "Company is required"),
  title: z.string().optional(),
  role: z.string(),
  notes: z.string().optional(),
  emails: z.array(emailSchema).min(1, "At least one email is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface RecruiterFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => Promise<void>;
  recruiter?: Recruiter & { recruiter_emails: RecruiterEmail[] };
}

export function RecruiterForm({
  open,
  onClose,
  onSubmit,
  recruiter,
}: RecruiterFormProps) {
  const isEdit = !!recruiter;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: recruiter
      ? {
          name: recruiter.name,
          company: recruiter.company,
          title: recruiter.title ?? "",
          role: recruiter.role ?? "Recruiter",
          notes: recruiter.notes ?? "",
          emails: recruiter.recruiter_emails.map((e) => ({
            email: e.email,
            type: e.type,
            is_primary: e.is_primary,
          })),
        }
      : {
          name: "",
          company: "",
          title: "",
          role: "Recruiter",
          notes: "",
          emails: [{ email: "", type: "work", is_primary: true }],
        },
  });

  // Reset form when recruiter changes (for edit mode)
  useEffect(() => {
    if (recruiter) {
      form.reset({
        name: recruiter.name,
        company: recruiter.company,
        title: recruiter.title ?? "",
        role: recruiter.role ?? "Recruiter",
        notes: recruiter.notes ?? "",
        emails: recruiter.recruiter_emails.map((e) => ({
          email: e.email,
          type: e.type,
          is_primary: e.is_primary,
        })),
      });
    } else {
      form.reset({
        name: "",
        company: "",
        title: "",
        role: "Recruiter",
        notes: "",
        emails: [{ email: "", type: "work", is_primary: true }],
      });
    }
  }, [recruiter, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "emails",
  });

  const handleSubmit = form.handleSubmit(async (data: FormValues) => {
    await onSubmit(data);
    form.reset();
    onClose();
  });

  const setPrimary = (index: number) => {
    const emails = form.getValues("emails");
    emails.forEach((_, i) => {
      form.setValue(`emails.${i}.is_primary`, i === index);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Recruiter" : "Add Recruiter"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name *</label>
            <Input {...form.register("name")} placeholder="Full name" />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Company *</label>
            <Input {...form.register("company")} placeholder="Company name" />
            {form.formState.errors.company && (
              <p className="text-xs text-destructive">
                {form.formState.errors.company.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              {...form.register("title")}
              placeholder="e.g. Senior Recruiter"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role *</label>
            <Select
              value={form.watch("role")}
              onValueChange={(v) => form.setValue("role", v as string)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Input {...form.register("notes")} placeholder="Optional notes" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Emails *</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ email: "", type: "work", is_primary: false })
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Email
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  {...form.register(`emails.${index}.email`)}
                  placeholder="email@example.com"
                  className="flex-1"
                />
                <Select
                  value={form.watch(`emails.${index}.type`)}
                  onValueChange={(v) => form.setValue(`emails.${index}.type`, v as string)}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant={
                    form.watch(`emails.${index}.is_primary`)
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => setPrimary(index)}
                >
                  Primary
                </Button>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {form.formState.errors.emails && (
              <p className="text-xs text-destructive">
                {form.formState.errors.emails.message ||
                  form.formState.errors.emails.root?.message}
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
