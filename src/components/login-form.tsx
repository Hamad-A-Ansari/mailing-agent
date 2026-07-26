"use client"

import { cn } from "@/lib/utils"
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
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-4xl font-bold tracking-tight">Switch FAANG</span>
          <h1 className="text-lg font-medium text-muted-foreground">
            Cold Email Outreach for Job Seekers
          </h1>
          <p className="text-sm text-muted-foreground/70 max-w-[300px]">
            Manage recruiters, craft templates, and send personalized outreach at scale.
          </p>
        </div>

        <div className="pt-4 flex justify-center [&_.cl-card]:bg-transparent [&_.cl-card]:shadow-none [&_.cl-card]:border-none [&_.cl-cardBox]:shadow-none [&_.cl-cardBox]:border-none [&_.cl-headerTitle]:hidden [&_.cl-headerSubtitle]:hidden [&_.cl-footer]:hidden [&_.cl-internal]:hidden [&_.cl-socialButtonsBlockButton]:bg-white/10 [&_.cl-socialButtonsBlockButton]:border-white/20 [&_.cl-socialButtonsBlockButton]:text-white [&_.cl-socialButtonsBlockButton:hover]:bg-white/20 [&_.cl-dividerRow]:hidden [&_.cl-formFieldRow]:hidden [&_.cl-formButtonPrimary]:hidden [&_.cl-identityPreview]:hidden [&_.cl-alert]:hidden [&_.cl-backLink]:hidden">
          <SignIn
            forceRedirectUrl="/"
            appearance={{
              variables: {
                colorBackground: "transparent",
                colorPrimary: "#ffffff",
              },
            }}
          />
        </div>

        <FieldDescription className="text-center text-xs pt-2 text-muted-foreground/60">
          Sign in to explore the full app. Demo users get access to all features except email sending.
        </FieldDescription>
      </FieldGroup>
    </div>
  )
}
