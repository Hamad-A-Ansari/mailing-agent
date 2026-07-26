"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import { SignIn } from "@clerk/nextjs"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-4 text-center mb-4">
          <span className="text-3xl font-bold tracking-tight">Switch FAANG</span>
          <h1 className="text-lg font-semibold text-foreground">
            Cold Email Outreach for Job Seekers
          </h1>
          <p className="text-sm text-muted-foreground max-w-[280px]">
            Manage recruiters, craft templates, and send personalized outreach at scale.
          </p>
        </div>

        <div className="pt-4 flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-transparent shadow-none border-none p-0",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "w-full",
                footer: "hidden",
                formFieldInput: "hidden",
                dividerRow: "hidden",
                formButtonPrimary: "hidden",
                identityPreview: "hidden",
                alert: "hidden",
              },
            }}
          />
        </div>

        <FieldDescription className="text-center text-xs pt-2">
          Sign in to explore the full app. Demo users get access to all features except email sending.
        </FieldDescription>
      </FieldGroup>
    </div>
  )
}
