"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare, Square, ArrowLeft, ArrowRight, Mail, Search, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import type { Recruiter, RecruiterEmail, TemplateCategory } from "@/types/database";

type RecruiterWithEmails = Recruiter & { recruiter_emails: RecruiterEmail[] };

type Step = 1 | 2 | 3 | 4;

interface SendResult {
  recruiterId: string;
  recruiterName: string;
  email: string;
  templateUsed: string;
  subjectUsed: string;
  status: "sent" | "failed";
  error?: string;
}

export default function SendPage() {
  const [step, setStep] = useState<Step>(1);
  const [recruiters, setRecruiters] = useState<RecruiterWithEmails[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<TemplateCategory | null>(null);
  const [emailTarget, setEmailTarget] = useState<"all" | "company" | "personal">("all");
  const [templateCounts, setTemplateCounts] = useState<Record<string, number>>({});
  const [subjectLineCount, setSubjectLineCount] = useState(0);
  const [resumes, setResumes] = useState<Array<{ id: string; display_name: string | null; filename: string }>>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [subjectLines, setSubjectLines] = useState<Array<{ id: string; text: string }>>([]);
  const [randomizeSubjects, setRandomizeSubjects] = useState(true);
  const [selectedSubjectLineId, setSelectedSubjectLineId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [allTemplates, setAllTemplates] = useState<Array<{ id: string; name: string; category: string; body: string }>>([]);

  // Check if user is in demo mode
  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((data) => {
      setIsDemo(data.isDemo ?? false);
    });
  }, []);

  // Fetch recruiters
  const fetchRecruiters = useCallback(async () => {
    const params = new URLSearchParams({ pageSize: "1000" });
    if (search) params.set("search", search);
    if (companyFilter) params.set("company", companyFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (roleFilter) params.set("role", roleFilter);
    const res = await fetch(`/api/recruiters?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRecruiters(data.recruiters);
    }
  }, [search, companyFilter, statusFilter, roleFilter]);

  useEffect(() => {
    fetchRecruiters();
  }, [fetchRecruiters]);

  // Fetch metadata for review step
  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then((data) => {
      const counts: Record<string, number> = {};
      const templates = data.templates || [];
      for (const t of templates) {
        counts[t.category] = (counts[t.category] || 0) + 1;
      }
      setTemplateCounts(counts);
      setAllTemplates(templates);
    });
    fetch("/api/subject-lines").then((r) => r.json()).then((data) => {
      setSubjectLineCount(data.activeCount || 0);
      setSubjectLines((data.subjectLines || []).filter((s: { is_active: boolean }) => s.is_active));
    });
    fetch("/api/resumes").then((r) => r.json()).then((data) => {
      const list = data.resumes || [];
      setResumes(list);
      // Default to the one marked as default
      const def = list.find((r: { is_default: boolean }) => r.is_default);
      if (def) setSelectedResumeId(def.id);
    });
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 50) next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === recruiters.length || selected.size >= 50) {
      setSelected(new Set());
    } else {
      setSelected(new Set(recruiters.slice(0, 50).map((r) => r.id)));
    }
  };

  const handleSend = async () => {
    if (!category || selected.size === 0) return;
    setSending(true);
    setProgress(0);
    setResults([]);

    try {
      const res = await fetch("/api/send-emails/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruiterIds: [...selected],
          templateCategory: category,
          templateId: selectedTemplateId || undefined,
          emailTarget,
          resumeId: selectedResumeId || undefined,
          randomizeSubjects,
          subjectLineId: !randomizeSubjects ? selectedSubjectLineId : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setResults([{ recruiterId: "", recruiterName: "", email: "", templateUsed: "", subjectUsed: "", status: "failed", error: err.error }]);
        setSending(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let totalCount = selected.size;

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "start") {
                totalCount = data.total;
              } else if (data.type === "progress") {
                setResults((prev) => [...prev, data]);
                setProgress(((data.index + 1) / totalCount) * 100);
              } else if (data.type === "done") {
                setProgress(100);
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } catch (err) {
      setResults([{ recruiterId: "", recruiterName: "", email: "", templateUsed: "", subjectUsed: "", status: "failed", error: err instanceof Error ? err.message : "Connection failed" }]);
    }

    setSending(false);
  };

  const handleTestEmail = async () => {
    if (!category) return;
    const res = await fetch("/api/send-emails/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateCategory: category }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`Test email sent to ${data.sentTo}`);
    } else {
      alert(`Failed: ${data.error}`);
    }
  };

  const companies = [...new Set(recruiters.map((r) => r.company))].sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Send Emails</h1>
        <p className="text-muted-foreground">
          Step {step} of 4 — {step === 1 ? "Select Recipients" : step === 2 ? "Choose Template" : step === 3 ? "Review" : "Sending"}
        </p>
      </div>

      {/* Step 1: Select Recipients */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select onValueChange={(v) => setCompanyFilter(v === "all" ? null : v as string)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => setStatusFilter(v === "all" ? null : v as string)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="No Response">No Response</SelectItem>
                <SelectItem value="Follow Up">Follow Up</SelectItem>
                <SelectItem value="Mailed">Mailed</SelectItem>
                <SelectItem value="Replied">Replied</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => setRoleFilter(v === "all" ? null : v as string)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Recruiter">Recruiter</SelectItem>
                <SelectItem value="Software Developer">Software Developer</SelectItem>
                <SelectItem value="Engineering Manager">Eng. Manager</SelectItem>
                <SelectItem value="Hiring Manager">Hiring Manager</SelectItem>
                <SelectItem value="Director">Director</SelectItem>
                <SelectItem value="VP">VP</SelectItem>
                <SelectItem value="Talent Sourcer">Talent Sourcer</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selected.size > 0 ? "Deselect All" : "Select All (max 50)"}
            </Button>
            <Badge variant={selected.size >= 50 ? "destructive" : "secondary"}>
              {selected.size} selected {selected.size >= 50 && "(max)"}
            </Badge>
          </div>

          <div className="rounded-md border max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recruiters.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => toggleSelect(r.id)}
                  >
                    <TableCell>
                      {selected.has(r.id) ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.company}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={selected.size === 0}>
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Choose Template */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Category selection */}
          <div className="grid gap-4 md:grid-cols-3">
            {(["outreach", "follow-up", "referral"] as const).map((cat) => (
              <Card
                key={cat}
                className={`cursor-pointer transition-colors ${category === cat ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"}`}
                onClick={() => { setCategory(cat); setSelectedTemplateId(null); }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="capitalize text-sm">{cat}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {templateCounts[cat] || 0} templates
                  </p>
                  {(templateCounts[cat] || 0) === 0 && (
                    <p className="text-xs text-destructive mt-1">No templates — add one first</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Template selection within category */}
          {category && (templateCounts[category] || 0) > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Select a template:</p>
              <div className="grid gap-2">
                {/* "Rotate All" option */}
                <div
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${!selectedTemplateId ? "border-emerald-500 bg-emerald-500/10" : "hover:border-emerald-500/50"}`}
                  onClick={() => setSelectedTemplateId(null)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Rotate All Templates</p>
                      <p className="text-xs text-muted-foreground">Randomly pick from all {templateCounts[category]} templates in this category</p>
                    </div>
                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                {/* Individual templates */}
                {allTemplates
                  .filter((t) => t.category === category)
                  .map((t) => (
                    <div
                      key={t.id}
                      className={`cursor-pointer rounded-lg border p-3 transition-colors ${selectedTemplateId === t.id ? "border-emerald-500 bg-emerald-500/10" : "hover:border-emerald-500/50"}`}
                      onClick={() => setSelectedTemplateId(t.id)}
                    >
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {t.body.substring(0, 100)}{t.body.length > 100 ? "..." : ""}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!category || (templateCounts[category] || 0) === 0}>
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Recipients</span>
                <span className="font-medium">{selected.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Category</span>
                <span className="font-medium capitalize">{category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Templates in category</span>
                <span className="font-medium">{category ? templateCounts[category] || 0 : 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Subject lines</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{randomizeSubjects ? "Randomize" : "Fixed"}</span>
                  <Switch checked={randomizeSubjects} onCheckedChange={setRandomizeSubjects} />
                </div>
              </div>
              {!randomizeSubjects && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Select subject</span>
                <Select value={selectedSubjectLineId ?? undefined} onValueChange={(v) => setSelectedSubjectLineId(v as string)}>
                  <SelectTrigger className="w-[280px] h-8">
                    <SelectValue placeholder="Pick a subject line">
                      {selectedSubjectLineId ? subjectLines.find(s => s.id === selectedSubjectLineId)?.text || "Select..." : "Pick a subject line"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {subjectLines.map((sl) => (
                      <SelectItem key={sl.id} value={sl.id}>{sl.text}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Send to</span>
                <Select value={emailTarget} onValueChange={(v) => setEmailTarget(v as "all" | "company" | "personal")}>
                  <SelectTrigger className="w-[200px] h-8">
                    <SelectValue>
                      {emailTarget === "all" ? "All Emails" : emailTarget === "company" ? "Company Emails Only" : "Personal Emails Only"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Emails</SelectItem>
                    <SelectItem value="company">Company Emails Only</SelectItem>
                    <SelectItem value="personal">Personal Emails Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Resume attachment</span>
                <Select value={selectedResumeId ?? "none"} onValueChange={(v) => setSelectedResumeId(v === "none" ? null : v as string)}>
                  <SelectTrigger className="w-[280px] h-8">
                    <SelectValue>
                      {selectedResumeId
                        ? resumes.find(r => r.id === selectedResumeId)?.display_name || resumes.find(r => r.id === selectedResumeId)?.filename || "Select..."
                        : "None (no attachment)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (No Attachment)</SelectItem>
                    {resumes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.display_name || r.filename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleTestEmail} disabled={isDemo}>
                Send Test Email
              </Button>
              <Button onClick={() => { setStep(4); handleSend(); }} disabled={isDemo}>
                <Mail className="mr-1 h-4 w-4" /> Send All
              </Button>
            </div>
          </div>
          {isDemo && (
            <p className="text-xs text-yellow-400 text-center">Email sending is disabled in demo mode.</p>
          )}
        </div>
      )}

      {/* Step 4: Sending Progress */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Progress bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  {sending && <Spinner className="h-4 w-4" />}
                  {sending ? "Sending emails..." : "Complete"}
                </p>
                <span className="text-sm text-muted-foreground">
                  {results.length} / {selected.size}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {sending && (
                <p className="text-xs text-muted-foreground mt-2">
                  Rate limited: 5-10s between each email.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="flex gap-4">
            <Badge variant="default" className="text-sm">
              {results.filter((r) => r.status === "sent").length} sent
            </Badge>
            {results.filter((r) => r.status === "failed").length > 0 && (
              <Badge variant="destructive" className="text-sm">
                {results.filter((r) => r.status === "failed").length} failed
              </Badge>
            )}
          </div>

          {/* Results table */}
          {results.length > 0 && (
            <div className="rounded-md border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recruiter</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.recruiterName}</TableCell>
                      <TableCell className="text-xs">{r.email}</TableCell>
                      <TableCell className="text-xs">{r.templateUsed}</TableCell>
                      <TableCell className="text-xs">{r.subjectUsed}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "sent" ? "default" : "destructive"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Actions */}
          {!sending && (
            <div className="flex gap-2">
              {results.filter((r) => r.status === "failed").length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const failedIds = results
                      .filter((r) => r.status === "failed" && r.recruiterId)
                      .map((r) => r.recruiterId);
                    if (failedIds.length > 0) {
                      setSelected(new Set(failedIds));
                      setResults([]);
                      setProgress(0);
                      handleSend();
                    }
                  }}
                >
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Retry Failed ({results.filter((r) => r.status === "failed").length})
                </Button>
              )}
              <Button variant="outline" onClick={() => { setStep(1); setSelected(new Set()); setResults([]); setProgress(0); }}>
                Send More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
