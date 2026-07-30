"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { ExternalLink, Search, MapPin, Building2, Trash2 } from "lucide-react";

interface LinkedInJob {
  id: string;
  linkedin_job_id: string;
  job_title: string;
  company: string;
  location: string | null;
  job_url: string | null;
  created_at: string;
}

export default function LinkedInJobsPage() {
  const [jobs, setJobs] = useState<LinkedInJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/linkedin-jobs");
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Derive unique locations and companies for filters
  const uniqueLocations = [...new Set(jobs.map((j) => j.location).filter(Boolean))] as string[];
  const uniqueCompanies = [...new Set(jobs.map((j) => j.company))].sort();

  // Apply filters
  const filteredJobs = jobs.filter((job) => {
    if (search && !job.job_title.toLowerCase().includes(search.toLowerCase()) && !job.company.toLowerCase().includes(search.toLowerCase())) return false;
    if (locationFilter && job.location !== locationFilter) return false;
    if (companyFilter && job.company !== companyFilter) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    toast.add({ title: "Job removed", type: "success" });
    await fetch(`/api/linkedin-jobs?id=${id}`, { method: "DELETE" });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return "just now";
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LinkedIn Jobs</h1>
        <p className="text-muted-foreground">
          Jobs imported from LinkedIn via the Chrome extension. Click "Apply" to go to the job post.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or company..."
            className="pl-9"
          />
        </div>
        {uniqueLocations.length > 1 && (
          <Select value={locationFilter ?? "all"} onValueChange={(v) => setLocationFilter(v === "all" ? null : v as string)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue>{locationFilter || "All Locations"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {uniqueLocations.map((loc) => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {uniqueCompanies.length > 1 && (
          <Select value={companyFilter ?? "all"} onValueChange={(v) => setCompanyFilter(v === "all" ? null : v as string)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue>{companyFilter || "All Companies"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {uniqueCompanies.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Badge variant="secondary" className="text-xs">
          {filteredJobs.length} jobs
        </Badge>
      </div>

      {/* Job list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={`skeleton-${i}`}>
              <CardContent className="py-3">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          {jobs.length === 0
            ? "No LinkedIn jobs imported yet. Use the Chrome extension on LinkedIn to save jobs here."
            : "No jobs match your filters."}
        </p>
      ) : (
        <div className="space-y-2">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{job.job_title}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {job.company}
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </span>
                      )}
                      <span>{timeAgo(job.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {job.job_url && (
                      <a href={job.job_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          Apply <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      </a>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(job.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
