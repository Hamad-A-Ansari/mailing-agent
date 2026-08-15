import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/supabase/auth-server";
import {
  Mail,
  Mic,
  Code2,
  Columns3,
  ArrowRight,
  Zap,
  Globe,
  CheckCircle2,
} from "lucide-react";

export default async function LandingPage() {
  // If already logged in, redirect to dashboard
  const userId = await getCurrentUserId();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg">Switch FAANG</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-in"
              className="rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-medium text-white hover:from-emerald-500 hover:to-teal-500 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 mb-6">
            <span className="text-xs font-medium text-emerald-400">Open Source Project</span>
            <span className="text-xs text-muted-foreground">by Hamad Ansari</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Your complete{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              job search
            </span>{" "}
            and{" "}
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              interview prep
            </span>{" "}
            toolkit
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Recruiter outreach, application tracking, AI-powered mock interviews, and a
            LeetCode-style coding environment — all in one platform.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-medium text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20"
            >
              Try it out
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/Hamad-A-Ansari/mailing-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              View Source
            </a>
          </div>
        </div>
      </section>

      {/* Tech Stack Bar */}
      <section className="border-y bg-muted/30 py-6 px-6">
        <div className="mx-auto max-w-4xl flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Built with:</span>
          {["Next.js 16", "Supabase", "Vapi", "Groq (LLaMA 3.3)", "Judge0", "Monaco Editor", "shadcn/ui", "Vercel"].map((tech) => (
            <span key={tech} className="rounded-full border px-3 py-1">{tech}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Two products, one platform</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              From cold emailing recruiters to practicing coding interviews — everything
              a job seeker needs in one place.
            </p>
          </div>

          <div className="grid gap-12">
            {/* Feature 1: Outreach */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1">
                  <Mail className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">Outreach CRM</span>
                </div>
                <h3 className="text-2xl font-bold">Cold email at scale</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Manage contacts with 8 role types, send personalized emails with template
                  variables, attach resumes, and track every interaction. Per-user SMTP with
                  encrypted credentials.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Bulk CSV import with smart column detection</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Automated follow-up scheduling (Vercel Cron)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Chrome Extension for LinkedIn scraping</li>
                </ul>
              </div>
              {/* Placeholder screenshot */}
              <div className="rounded-xl border bg-gradient-to-br from-emerald-500/5 to-teal-500/5 p-1">
                <div className="rounded-lg bg-muted/50 h-64 flex items-center justify-center border border-dashed border-emerald-500/20">
                  <div className="text-center space-y-2">
                    <Mail className="h-8 w-8 text-emerald-400/50 mx-auto" />
                    <p className="text-xs text-muted-foreground">Outreach Dashboard Screenshot</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Kanban */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1 rounded-xl border bg-gradient-to-br from-cyan-500/5 to-blue-500/5 p-1">
                <div className="rounded-lg bg-muted/50 h-64 flex items-center justify-center border border-dashed border-cyan-500/20">
                  <div className="text-center space-y-2">
                    <Columns3 className="h-8 w-8 text-cyan-400/50 mx-auto" />
                    <p className="text-xs text-muted-foreground">Application Kanban Screenshot</p>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1">
                  <Columns3 className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-xs font-medium text-cyan-400">Application Tracker</span>
                </div>
                <h3 className="text-2xl font-bold">9-stage drag-and-drop kanban</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Track applications from Saved to Accepted. Cards show company logos, priority,
                  tags, interview dates, salary ranges, stale indicators, and quick notes.
                  Context menu to move stages or start a practice interview.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> Google Favicon company logos</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> Sub-stages, meet links, interview dates</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> One-click "Practice Interview" per company</li>
                </ul>
              </div>
            </div>

            {/* Feature 3: AI Interview */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1">
                  <Mic className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-xs font-medium text-violet-400">AI Voice Interviews</span>
                </div>
                <h3 className="text-2xl font-bold">Mock interviews with voice AI</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Real-time voice conversations with an AI interviewer powered by Vapi.
                  Generates role-specific questions via Groq (LLaMA 3.3 70B), then scores
                  your performance across 5 evaluation dimensions.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-violet-400" /> Company + role-specific question generation</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-violet-400" /> AI feedback with category scores (0-100)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-violet-400" /> Strengths & areas for improvement analysis</li>
                </ul>
              </div>
              <div className="rounded-xl border bg-gradient-to-br from-violet-500/5 to-indigo-500/5 p-1">
                <div className="rounded-lg bg-muted/50 h-64 flex items-center justify-center border border-dashed border-violet-500/20">
                  <div className="text-center space-y-2">
                    <Mic className="h-8 w-8 text-violet-400/50 mx-auto" />
                    <p className="text-xs text-muted-foreground">AI Interview Screenshot</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4: Coding */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1 rounded-xl border bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-1">
                <div className="rounded-lg bg-muted/50 h-64 flex items-center justify-center border border-dashed border-amber-500/20">
                  <div className="text-center space-y-2">
                    <Code2 className="h-8 w-8 text-amber-400/50 mx-auto" />
                    <p className="text-xs text-muted-foreground">Coding Editor Screenshot</p>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1">
                  <Code2 className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">Coding Platform</span>
                </div>
                <h3 className="text-2xl font-bold">LeetCode-style coding environment</h3>
                <p className="text-muted-foreground leading-relaxed">
                  2,913 problems seeded from LeetCode. Monaco Editor (VS Code engine) with resizable
                  split panels, Judge0 sandboxed execution, and a custom test-harness generator
                  that parses function signatures across 6 languages.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Company-tagged problems (FAANG filter)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Blind 75 / NeetCode 150 with progress</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Per-test-case pass/fail with green/red indicators</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Countdown timer (30/45/60 min)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture / How it works */}
      <section className="border-t py-20 px-6 bg-muted/20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Under the hood</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-12">
            A full-stack application with 20+ API routes, 14 database tables, real-time voice AI,
            sandboxed code execution, and automated email delivery.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {[
              { label: "Frontend", detail: "Next.js 16 (App Router, Server Components, Server Actions)" },
              { label: "Database", detail: "Supabase PostgreSQL with 14 tables, GIN indexes" },
              { label: "Voice AI", detail: "Vapi (Deepgram transcription + ElevenLabs TTS)" },
              { label: "LLM", detail: "Groq (LLaMA 3.3 70B) for generation + scoring" },
              { label: "Code Execution", detail: "Judge0 CE with custom multi-language harness" },
              { label: "Email", detail: "Nodemailer + per-user SMTP + Vercel Cron" },
              { label: "Auth", detail: "Supabase Auth (email/password)" },
              { label: "Editor", detail: "Monaco Editor (VS Code engine)" },
              { label: "Deployment", detail: "Vercel (Edge + Serverless)" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border bg-card p-4">
                <p className="text-xs font-medium text-emerald-400 mb-1">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Try it yourself</h2>
          <p className="text-muted-foreground mb-8">
            Sign up and explore the full platform — outreach CRM, kanban tracker,
            AI interviews, and the coding environment.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-3.5 text-sm font-medium text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-medium">Switch FAANG</span>
            <span className="text-xs text-muted-foreground">
              — Built by Hamad Ahmad Ansari
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/Hamad-A-Ansari" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            </a>
            <a href="https://linkedin.com/in/hamad-a-ansari" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="https://hamadansari.vercel.app" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Globe className="h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
