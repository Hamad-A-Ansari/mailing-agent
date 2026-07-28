import { auth } from "@clerk/nextjs/server";

interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  department: string;
  url: string;
  postedAt: string | null;
  source: "greenhouse" | "lever";
}

/**
 * GET /api/jobs?company=stripe&query=engineer
 * Search jobs from Greenhouse and Lever public APIs.
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

  const jobs: JobResult[] = [];

  // Try Greenhouse
  try {
    const ghRes = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );
    if (ghRes.ok) {
      const ghData = await ghRes.json();
      const ghJobs: JobResult[] = (ghData.jobs || []).map((job: {
        id: number;
        title: string;
        location: { name: string };
        departments: Array<{ name: string }>;
        absolute_url: string;
        updated_at: string;
      }) => ({
        id: `gh-${job.id}`,
        title: job.title,
        company: company.charAt(0).toUpperCase() + company.slice(1),
        location: job.location?.name || "Not specified",
        department: job.departments?.[0]?.name || "",
        url: job.absolute_url,
        postedAt: job.updated_at || null,
        source: "greenhouse" as const,
      }));
      jobs.push(...ghJobs);
    }
  } catch {
    // Greenhouse failed — continue to Lever
  }

  // Try Lever
  try {
    const leverRes = await fetch(
      `https://api.lever.co/v0/postings/${company}`,
      { next: { revalidate: 300 } }
    );
    if (leverRes.ok) {
      const leverData = await leverRes.json();
      const leverJobs: JobResult[] = (leverData || []).map((job: {
        id: string;
        text: string;
        categories: { location: string; team: string; department: string };
        hostedUrl: string;
        createdAt: number;
      }) => ({
        id: `lever-${job.id}`,
        title: job.text,
        company: company.charAt(0).toUpperCase() + company.slice(1),
        location: job.categories?.location || "Not specified",
        department: job.categories?.team || job.categories?.department || "",
        url: job.hostedUrl,
        postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : null,
        source: "lever" as const,
      }));
      jobs.push(...leverJobs);
    }
  } catch {
    // Lever failed — continue
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
    source: jobs.length > 0 ? (jobs[0].source === "greenhouse" ? "Greenhouse" : "Lever") : null,
  });
}
