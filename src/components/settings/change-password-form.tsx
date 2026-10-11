"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
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

const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const handleSubmit = form.handleSubmit(async ({ newPassword }) => {
    const supabase = createAuthClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast.add({ title: "Could not update password", description: getAuthErrorMessage(error), type: "error" });
      return;
    }

    form.reset();
    toast.add({ title: "Password updated", type: "success" });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Update the password used to sign in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field>
            <FieldLabel htmlFor="settings-new-password">New password</FieldLabel>
            <PasswordInput
              id="settings-new-password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.newPassword}
              {...form.register("newPassword")}
            />
            <FieldError errors={[form.formState.errors.newPassword]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="settings-confirm-password">Confirm new password</FieldLabel>
            <PasswordInput
              id="settings-confirm-password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.confirmPassword}
              {...form.register("confirmPassword")}
            />
            <FieldError errors={[form.formState.errors.confirmPassword]} />
          </Field>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
