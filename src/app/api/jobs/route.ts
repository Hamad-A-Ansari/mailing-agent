import { auth } from "@clerk/nextjs/server";

interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  department: string;
  url: string;
  postedAt: string | null;
  source: "greenhouse" | "lever" | "ashby" | "smartrecruiters";
}

/**
 * GET /api/jobs?company=stripe&query=engineer
 * Search jobs from Greenhouse, Lever, Ashby, and SmartRecruiters public APIs.
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const company = searchParams.get("company")?.toLowerCase().trim();
  const query = searchParams.get("query")?.toLowerCase().trim();

  if (!company) {
    return Response.json({ error: "Company name is required" }, { status: 400 });
  }

  const companyDisplay = company.charAt(0).toUpperCase() + company.slice(1);
  const jobs: JobResult[] = [];

  // Fetch from all 4 sources in parallel
  const results = await Promise.allSettled([
    fetchGreenhouse(company, companyDisplay),
    fetchLever(company, companyDisplay),
    fetchAshby(company, companyDisplay),
    fetchSmartRecruiters(company, companyDisplay),
  ]);

  for (const result of results) {
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
    }
  }

  // Filter by query if provided
  let filtered = jobs;
  if (query) {
    filtered = jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(query) ||
        job.department.toLowerCase().includes(query) ||
        job.location.toLowerCase().includes(query)
    );
  }

  // Sort by date (newest first)
  filtered.sort((a, b) => {
    if (!a.postedAt) return 1;
    if (!b.postedAt) return -1;
    return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
  });

  return Response.json({
    jobs: filtered,
    total: filtered.length,
    sources: [...new Set(jobs.map((j) => j.source))],
  });
}

// ============================================================
// Greenhouse
// ============================================================
async function fetchGreenhouse(company: string, companyDisplay: string): Promise<JobResult[]> {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || []).map((job: {
      id: number;
      title: string;
      location: { name: string };
      departments: Array<{ name: string }>;
      absolute_url: string;
      updated_at: string;
    }) => ({
      id: `gh-${job.id}`,
      title: job.title,
      company: companyDisplay,
      location: job.location?.name || "Not specified",
      department: job.departments?.[0]?.name || "",
      url: job.absolute_url,
      postedAt: job.updated_at || null,
      source: "greenhouse" as const,
    }));
  } catch {
    return [];
  }
}

// ============================================================
// Lever
// ============================================================
async function fetchLever(company: string, companyDisplay: string): Promise<JobResult[]> {
  try {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${company}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((job: {
      id: string;
      text: string;
      categories: { location: string; team: string; department: string };
      hostedUrl: string;
      createdAt: number;
    }) => ({
      id: `lever-${job.id}`,
      title: job.text,
      company: companyDisplay,
      location: job.categories?.location || "Not specified",
      department: job.categories?.team || job.categories?.department || "",
      url: job.hostedUrl,
      postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : null,
      source: "lever" as const,
    }));
  } catch {
    return [];
  }
}

// ============================================================
// Ashby
// ============================================================
async function fetchAshby(company: string, companyDisplay: string): Promise<JobResult[]> {
  try {
    const res = await fetch(
      `https://api.ashbyhq.com/posting-api/job-board/${company}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || []).map((job: {
      id: string;
      title: string;
      location: string;
      department: string;
      publishedAt: string;
      jobUrl: string;
    }) => ({
      id: `ashby-${job.id}`,
      title: job.title,
      company: companyDisplay,
      location: job.location || "Not specified",
      department: job.department || "",
      url: job.jobUrl || `https://jobs.ashbyhq.com/${company}/${job.id}`,
      postedAt: job.publishedAt || null,
      source: "ashby" as const,
    }));
  } catch {
    return [];
  }
}

// ============================================================
// SmartRecruiters
// ============================================================
async function fetchSmartRecruiters(company: string, companyDisplay: string): Promise<JobResult[]> {
  try {
    const res = await fetch(
      `https://api.smartrecruiters.com/v1/companies/${company}/postings`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.content || []).map((job: {
      id: string;
      name: string;
      location: { city: string; region: string; country: string };
      department: { label: string };
      releasedDate: string;
      ref: string;
    }) => {
      const loc = job.location
        ? [job.location.city, job.location.region, job.location.country].filter(Boolean).join(", ")
        : "Not specified";
      return {
        id: `sr-${job.id}`,
        title: job.name,
        company: companyDisplay,
        location: loc,
        department: job.department?.label || "",
        url: job.ref || `https://jobs.smartrecruiters.com/${company}/${job.id}`,
        postedAt: job.releasedDate || null,
        source: "smartrecruiters" as const,
      };
    });
  } catch {
    return [];
  }
}
