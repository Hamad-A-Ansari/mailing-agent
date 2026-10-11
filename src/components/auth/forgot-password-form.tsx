"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { getAuthErrorMessage, NEUTRAL_RESET_MESSAGE } from "@/lib/supabase/auth-errors";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const handleSubmit = form.handleSubmit(async ({ email }) => {
    setFormError(null);
    const supabase = createAuthClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }

    setSubmitted(true);
  });

  if (submitted) {
    return (
      <div className={cn("flex flex-col gap-8", className)} {...props}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-4xl font-bold tracking-tight">Switch FAANG</span>
            <h1 className="text-lg font-medium">Check your email</h1>
            <p className="text-sm text-muted-foreground max-w-[320px]">
              {NEUTRAL_RESET_MESSAGE}
            </p>
          </div>
          <div className="text-center">
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to sign in
            </Link>
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
            Reset your password
          </h1>
          <p className="text-sm text-muted-foreground/70 max-w-[300px]">
            Enter the email associated with your account and we&apos;ll send a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4" noValidate>
          <Field>
            <FieldLabel htmlFor="forgot-password-email" className="sr-only">
              Email
            </FieldLabel>
            <Input
              id="forgot-password-email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
            <FieldError errors={[form.formState.errors.email]} />
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
            {form.formState.isSubmitting ? "Please wait..." : "Send Reset Link"}
          </Button>
        </form>

        <div className="text-center">
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </FieldGroup>
    </div>
  );
}
