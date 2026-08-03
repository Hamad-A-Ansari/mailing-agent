"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    const supabase = createAuthClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.push("/");
    router.refresh();
  };

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

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>

        <FieldDescription className="text-center text-xs pt-2 text-muted-foreground/60">
          Sign in to explore the full app. Demo users get access to all features except email sending.
        </FieldDescription>
      </FieldGroup>
    </div>
  );
}
