"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { getAuthErrorMessage, NEUTRAL_SIGNUP_MESSAGE } from "@/lib/supabase/auth-errors";

const signUpSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
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

type SignUpValues = z.infer<typeof signUpSchema>;

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const handleSubmit = form.handleSubmit(async ({ email, password }) => {
    setFormError(null);
    const supabase = createAuthClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
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
              {NEUTRAL_SIGNUP_MESSAGE}
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
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground/70 max-w-[300px]">
            Manage contacts, craft templates, and send personalized outreach at scale.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4" noValidate>
          <Field>
            <FieldLabel htmlFor="sign-up-email" className="sr-only">
              Email
            </FieldLabel>
            <Input
              id="sign-up-email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
            <FieldError errors={[form.formState.errors.email]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="sign-up-password" className="sr-only">
              Password
            </FieldLabel>
            <PasswordInput
              id="sign-up-password"
              placeholder="Password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.password}
              {...form.register("password")}
            />
            <FieldError errors={[form.formState.errors.password]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="sign-up-confirm-password" className="sr-only">
              Confirm password
            </FieldLabel>
            <PasswordInput
              id="sign-up-confirm-password"
              placeholder="Confirm password"
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
            {form.formState.isSubmitting ? "Please wait..." : "Create Account"}
          </Button>
        </form>

        <div className="text-center">
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>

        <FieldDescription className="text-center text-xs pt-2 text-muted-foreground/60">
          By creating an account, you agree to use this tool responsibly for your own job search outreach.
        </FieldDescription>
      </FieldGroup>
    </div>
  );
}
