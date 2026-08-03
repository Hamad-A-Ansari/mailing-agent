import { getAuthUserId } from "@/lib/auth";
import { isOwner } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import * as XLSX from "xlsx";

/**
 * GET /api/recruiters/export
 * Export filtered recruiters as .xlsx. Owner only.
 */
export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  // Only owner can export
  if (!isOwner(userId)) {
    return Response.json({ error: "Export disabled in demo mode" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const company = searchParams.get("company");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("recruiters")
    .select("*, recruiter_emails(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (company) query = query.eq("company", company);
  if (status) query = query.eq("status", status);
  if (search) query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%`);

  const { data: recruiters, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Build Excel data
  const rows = (recruiters || []).map((r) => {
    const primaryEmail = r.recruiter_emails?.find(
      (e: { is_primary: boolean }) => e.is_primary
    )?.email || "";
    const otherEmails = r.recruiter_emails
      ?.filter((e: { is_primary: boolean }) => !e.is_primary)
      .map((e: { email: string }) => e.email)
      .join(", ") || "";

    return {
      Name: r.name,
      Company: r.company,
      "Title/Role": r.title || "",
      "Primary Email": primaryEmail,
      "Other Emails": otherEmails,
      Status: r.status,
      "Date Added": new Date(r.created_at).toLocaleDateString(),
      Notes: r.notes || "",
    };
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Recruiters");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const date = new Date().toISOString().split("T")[0];

  await logActivity(userId, "exported_recruiters", {
    rowCount: rows.length,
    filters: { company, status, search },
  });

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="recruiters-export-${date}.xlsx"`,
    },
  });
}
