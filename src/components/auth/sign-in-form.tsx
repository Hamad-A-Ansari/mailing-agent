"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { getAuthErrorMessage } from "@/lib/supabase/auth-errors";

const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleSubmit = form.handleSubmit(async ({ email, password }) => {
    setFormError(null);
    const supabase = createAuthClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }

    router.push("/dashboard");
    router.refresh();
  });

  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-4xl font-bold tracking-tight">Switch FAANG</span>
          <h1 className="text-lg font-medium text-muted-foreground">
            Cold Email Outreach for Job Seekers
          </h1>
          <p className="text-sm text-muted-foreground/70 max-w-[300px]">
            Manage contacts, craft templates, and send personalized outreach at scale.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4" noValidate>
          <Field>
            <FieldLabel htmlFor="sign-in-email" className="sr-only">
              Email
            </FieldLabel>
            <Input
              id="sign-in-email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
            <FieldError errors={[form.formState.errors.email]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="sign-in-password" className="sr-only">
              Password
            </FieldLabel>
            <PasswordInput
              id="sign-in-password"
              placeholder="Password"
              autoComplete="current-password"
              aria-invalid={!!form.formState.errors.password}
              {...form.register("password")}
            />
            <FieldError errors={[form.formState.errors.password]} />
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </Link>
            </div>
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
            {form.formState.isSubmitting ? "Please wait..." : "Sign In"}
          </Button>
        </form>

        <div className="text-center">
          <Link
            href="/sign-up"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Don&apos;t have an account? Sign up
          </Link>
        </div>

        <FieldDescription className="text-center text-xs pt-2 text-muted-foreground/60">
          Sign in to explore the full app. Demo users get access to all features except email sending.
        </FieldDescription>
      </FieldGroup>
    </div>
  );
}
