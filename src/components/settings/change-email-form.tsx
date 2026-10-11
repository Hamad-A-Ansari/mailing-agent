"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { getAuthErrorMessage } from "@/lib/supabase/auth-errors";

const changeEmailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

type ChangeEmailValues = z.infer<typeof changeEmailSchema>;

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const form = useForm<ChangeEmailValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { email: "" },
  });

  const handleSubmit = form.handleSubmit(async ({ email }) => {
    if (email === currentEmail) {
      form.setError("email", { message: "This is already your current email" });
      return;
    }

    const supabase = createAuthClient();
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=/settings` }
    );

    if (error) {
      toast.add({ title: "Could not update email", description: getAuthErrorMessage(error), type: "error" });
      return;
    }

    setPendingConfirmation(true);
    toast.add({
      title: "Confirmation email sent",
      description: "Check your inbox to confirm the email change.",
      type: "success",
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email address</CardTitle>
        <CardDescription>
          Current: <span className="text-foreground">{currentEmail}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field>
            <FieldLabel htmlFor="new-email">New email address</FieldLabel>
            <Input
              id="new-email"
              type="email"
              placeholder="new-email@example.com"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
            <FieldError errors={[form.formState.errors.email]} />
          </Field>

          {pendingConfirmation && (
            <p className="text-sm text-muted-foreground">
              A confirmation link was sent to the new address. Your email won&apos;t change until you confirm it.
            </p>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Sending..." : "Update Email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
