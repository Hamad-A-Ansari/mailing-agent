"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ExternalLink, MapPin, Building2, Briefcase, ChevronDown, ChevronUp, BookmarkPlus } from "lucide-react";
import { toast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  department: string;
  description: string;
  url: string;
  postedAt: string | null;
  source: "greenhouse" | "lever" | "ashby" | "smartrecruiters";
}

// Pre-populated company suggestions (Greenhouse/Lever/Ashby/SmartRecruiters)
const companySuggestions = [
  "stripe", "airbnb", "discord", "figma", "notion", "coinbase",
  "doordash", "netlify", "openai", "linear", "retool",
  "netflix", "twitch", "reddit", "ramp", "databricks",
  "plaid", "brex", "rippling", "scale", "anduril",
  "vercel", "cursor", "deel", "vanta", "snowflake",
  "visa", "bosch", "skechers", "linkedin",
];

export default function JobsPage() {
  const [company, setCompany] = useState("");
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [total, setTotal] = useState(0);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!company.trim()) return;
    setLoading(true);
    setSearched(true);
    setLocationFilter(null);
    setDepartmentFilter(null);

    const params = new URLSearchParams({ company: company.trim() });
    if (query.trim()) params.set("query", query.trim());

    const res = await fetch(`/api/jobs?${params}`);
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs);
      setTotal(data.total);
    } else {
      setJobs([]);
      setTotal(0);
    }
    setLoading(false);
  };

  // Derive unique locations and departments for filters
  const uniqueLocations = [...new Set(jobs.map((j) => j.location))].sort();
  const uniqueDepartments = [...new Set(jobs.map((j) => j.department).filter(Boolean))].sort();

  // Apply client-side filters
  const filteredJobs = jobs.filter((job) => {
    if (locationFilter && job.location !== locationFilter) return false;
    if (departmentFilter && job.department !== departmentFilter) return false;
    return true;
  });

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Job Search</h1>
        <p className="text-muted-foreground">
          Search open positions directly from company job boards (Greenhouse, Lever, Ashby, SmartRecruiters).
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name (e.g. stripe, airbnb, discord)"
                  className="pl-9"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="relative flex-1">
                <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Role filter (e.g. engineer, intern, product)"
                  className="pl-9"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading || !company.trim()}>
                <Search className="mr-1 h-4 w-4" />
                Search
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {companySuggestions.slice(0, 12).map((c) => (
                <button
                  key={c}
                  type="button"
                  className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors capitalize"
                  onClick={() => { setCompany(c); }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={`skeleton-${i}`}>
              <CardContent className="py-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-64" />
                  <div className="flex gap-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : searched ? (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              {filteredJobs.length} of {total} {total === 1 ? "job" : "jobs"}
              {query && ` matching "${query}"`}
            </p>
            <div className="flex gap-2">
              {uniqueLocations.length > 1 && (
                <Select value={locationFilter ?? "all"} onValueChange={(v) => setLocationFilter(v === "all" ? null : v as string)}>
                  <SelectTrigger className="w-[200px] h-8">
                    <SelectValue>
                      {locationFilter || "All Locations"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueLocations.map((loc) => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {uniqueDepartments.length > 1 && (
                <Select value={departmentFilter ?? "all"} onValueChange={(v) => setDepartmentFilter(v === "all" ? null : v as string)}>
                  <SelectTrigger className="w-[200px] h-8">
                    <SelectValue>
                      {departmentFilter || "All Departments"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {uniqueDepartments.map((dep) => (
                      <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              No jobs found. Try a different company name or check the spelling.
              <br />
              <span className="text-xs">Supports companies using Greenhouse, Lever, Ashby, or SmartRecruiters.</span>
            </p>
          ) : (
            <div className="space-y-2">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className="text-sm font-medium">{job.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {job.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                          {job.department && (
                            <Badge variant="secondary" className="text-[10px]">
                              {job.department}
                            </Badge>
                          )}
                          {job.postedAt && (
                            <span>{timeAgo(job.postedAt)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {job.description && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                            title="View description"
                          >
                            {expandedJobId === job.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await fetch("/api/applications", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                job_title: job.title,
                                company: job.company,
                                stage: "Saved",
                                job_url: job.url,
                                location: job.location,
                                department: job.department,
                                source: job.source,
                              }),
                            });
                            toast.add({ title: "Saved to Applications", type: "success" });
                          }}
                          title="Track application"
                        >
                          <BookmarkPlus className="h-4 w-4" />
                        </Button>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {job.source}
                        </Badge>
                        <a href={job.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            Apply <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        </a>
                      </div>
                    </div>
                    {expandedJobId === job.id && job.description && (
                      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground max-h-[250px] overflow-y-auto scrollbar-none whitespace-pre-wrap leading-relaxed">
                        {job.description
                          .replace(/<[^>]+>/g, "\n")
                          .replace(/&nbsp;/g, " ")
                          .replace(/&amp;/g, "&")
                          .replace(/&lt;/g, "<")
                          .replace(/&gt;/g, ">")
                          .replace(/&#\d+;/g, "")
                          .replace(/\n{3,}/g, "\n\n")
                          .trim()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Enter a company name to search their open positions.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Supports companies using Greenhouse or Lever job boards.
          </p>
        </div>
      )}
    </div>
  );
}
