"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { getAuthErrorMessage } from "@/lib/supabase/auth-errors";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/**
 * Form for setting a new password. The user arrives here already
 * authenticated via the recovery link exchanged in /auth/callback,
 * so this calls supabase.auth.updateUser rather than a password-reset
 * request.
 */
export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const handleSubmit = form.handleSubmit(async ({ password }) => {
    setFormError(null);
    const supabase = createAuthClient();

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  });

  if (success) {
    return (
      <div className={cn("flex flex-col gap-8", className)} {...props}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-4xl font-bold tracking-tight">Switch FAANG</span>
            <h1 className="text-lg font-medium">Password updated</h1>
            <p className="text-sm text-muted-foreground max-w-[320px]">
              Taking you to your dashboard...
            </p>
          </div>
        </FieldGroup>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-4xl font-bold tracking-tight">Switch FAANG</span>
          <h1 className="text-lg font-medium text-muted-foreground">
            Set a new password
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4" noValidate>
          <Field>
            <FieldLabel htmlFor="reset-password-new" className="sr-only">
              New password
            </FieldLabel>
            <PasswordInput
              id="reset-password-new"
              placeholder="New password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.password}
              {...form.register("password")}
            />
            <FieldError errors={[form.formState.errors.password]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="reset-password-confirm" className="sr-only">
              Confirm new password
            </FieldLabel>
            <PasswordInput
              id="reset-password-confirm"
              placeholder="Confirm new password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.confirmPassword}
              {...form.register("confirmPassword")}
            />
            <FieldError errors={[form.formState.errors.confirmPassword]} />
          </Field>

          {formError && (
            <p role="alert" className="text-sm text-destructive text-center">
              {formError}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Please wait..." : "Update Password"}
          </Button>
        </form>
      </FieldGroup>
    </div>
  );
}
