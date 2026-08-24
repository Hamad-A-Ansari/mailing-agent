"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, Pencil, Trash2, Copy, Check } from "lucide-react";
import { RecruiterFilters } from "./recruiter-filters";
import { RecruiterForm } from "./recruiter-form";
import { BulkUploadDialog } from "./bulk-upload-dialog";
import { toast } from "@/components/ui/toast";
import type { Recruiter, RecruiterEmail, RecruiterStatus } from "@/types/database";

type RecruiterWithEmails = Recruiter & { recruiter_emails: RecruiterEmail[]; recruiter_phones?: Array<{ id: string; phone: string; label: string; is_primary: boolean }> };

interface RecruiterTableProps {
  userRole: "owner" | "viewer";
  isDemo?: boolean;
}

const statusColors: Record<RecruiterStatus, string> = {
  Mailed: "bg-blue-100 text-blue-800",
  "Follow Up": "bg-yellow-100 text-yellow-800",
  Replied: "bg-green-100 text-green-800",
  "No Response": "bg-gray-100 text-gray-800",
};

export function RecruiterTable({ userRole, isDemo = false }: RecruiterTableProps) {
  const [recruiters, setRecruiters] = useState<RecruiterWithEmails[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [companies, setCompanies] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingRecruiter, setEditingRecruiter] = useState<RecruiterWithEmails | undefined>();
  const [loading, setLoading] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    toast.add({ title: "Email copied", type: "success" });
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const isOwner = true;
  const pageSize = 20;

  const fetchRecruiters = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set("search", search);
    if (company) params.set("company", company);
    if (status) params.set("status", status);
    if (roleFilter) params.set("role", roleFilter);

    const res = await fetch(`/api/recruiters?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRecruiters(data.recruiters);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, search, company, status, roleFilter]);

  useEffect(() => {
    fetchRecruiters();
  }, [fetchRecruiters]);

  // Fetch unique companies for filter
  useEffect(() => {
    fetch("/api/recruiters?pageSize=1000")
      .then((r) => r.json())
      .then((data) => {
        const unique = [
          ...new Set(data.recruiters?.map((r: RecruiterWithEmails) => r.company) ?? []),
        ] as string[];
        setCompanies(unique.sort());
      });
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    // Optimistic update
    setRecruiters((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus as RecruiterWithEmails["status"] } : r))
    );
    const res = await fetch(`/api/recruiters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) fetchRecruiters(); // Rollback on error
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    // Optimistic remove
    const previousRecruiters = recruiters;
    setRecruiters((prev) => prev.filter((r) => r.id !== id));
    setTotal((prev) => prev - 1);
    const res = await fetch(`/api/recruiters/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setRecruiters(previousRecruiters);
      setTotal((prev) => prev + 1);
      toast.add({ title: "Failed to delete contact", type: "error" });
    } else {
      toast.add({ title: "Contact deleted", type: "success" });
    }
  };

  const handleCreate = async (data: Record<string, unknown>) => {
    await fetch("/api/recruiters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    toast.add({ title: "Contact added", type: "success" });
    fetchRecruiters();
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editingRecruiter) return;
    
    // Optimistic update — update local state immediately
    setRecruiters((prev) =>
      prev.map((r) => (r.id === editingRecruiter.id ? { ...r, ...data } as typeof r : r))
    );
    setEditingRecruiter(undefined);
    toast.add({ title: "Contact updated", type: "success" });

    // Persist in background
    const res = await fetch(`/api/recruiters/${editingRecruiter.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    // If failed, rollback by re-fetching
    if (!res.ok) {
      toast.add({ title: "Update failed, refreshing...", type: "error" });
      fetchRecruiters();
    }
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (company) params.set("company", company);
    if (status) params.set("status", status);

    const res = await fetch(`/api/recruiters/export?${params}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recruiters-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <RecruiterFilters
        userRole={userRole}
        isDemo={isDemo}
        companies={companies}
        onSearchChange={(s) => { setSearch(s); setPage(1); }}
        onCompanyChange={(c) => { setCompany(c); setPage(1); }}
        onStatusChange={(s) => { setStatus(s); setPage(1); }}
        onRoleChange={(r) => { setRoleFilter(r); setPage(1); }}
        onAddClick={() => { setEditingRecruiter(undefined); setFormOpen(true); }}
        onBulkUploadClick={() => setBulkUploadOpen(true)}
        onExportClick={handleExport}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Company Email</TableHead>
              <TableHead>Personal Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              {isOwner && <TableHead className="w-[70px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-24" /></TableCell>
                  {isOwner && <TableCell><Skeleton className="h-7 w-7" /></TableCell>}
                </TableRow>
              ))
            ) : recruiters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isOwner ? 9 : 8} className="text-center py-8 text-muted-foreground">
                  No recruiters found
                </TableCell>
              </TableRow>
            ) : (
              recruiters.map((recruiter) => {
                const companyEmails = recruiter.recruiter_emails?.filter(e => e.type === "work") || [];
                const personalEmails = recruiter.recruiter_emails?.filter(e => e.type === "personal") || [];

                return (
                <TableRow key={recruiter.id}>
                  <TableCell className="font-medium">{recruiter.name}</TableCell>
                  <TableCell>{recruiter.company}</TableCell>
                  <TableCell>{recruiter.title || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{recruiter.role || "Recruiter"}</Badge>
                  </TableCell>
                  <TableCell>
                    {companyEmails.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {companyEmails.map(e => (
                          <div key={e.id} className="flex items-center gap-1">
                            <span className="text-xs">{e.email}</span>
                            <button
                              type="button"
                              className="shrink-0 p-0.5 rounded hover:bg-muted"
                              onClick={() => copyEmail(e.email)}
                              title="Copy"
                            >
                              {copiedEmail === e.email ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {personalEmails.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {personalEmails.map(e => (
                          <div key={e.id} className="flex items-center gap-1">
                            <span className="text-xs">{e.email}</span>
                            <button
                              type="button"
                              className="shrink-0 p-0.5 rounded hover:bg-muted"
                              onClick={() => copyEmail(e.email)}
                              title="Copy"
                            >
                              {copiedEmail === e.email ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {recruiter.recruiter_phones && recruiter.recruiter_phones.length > 0 ? (
                      <div className="space-y-0.5">
                        {recruiter.recruiter_phones.map((p: { id: string; phone: string; label: string }) => (
                          <a
                            key={p.id}
                            href={`tel:${p.phone}`}
                            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                            title={`Call (${p.label})`}
                          >
                            📞 {p.phone}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isOwner ? (
                      <Select
                        value={recruiter.status}
                        onValueChange={(v) => handleStatusChange(recruiter.id, v as string)}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mailed">Mailed</SelectItem>
                          <SelectItem value="Follow Up">Follow Up</SelectItem>
                          <SelectItem value="Replied">Replied</SelectItem>
                          <SelectItem value="No Response">No Response</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={statusColors[recruiter.status]}>
                        {recruiter.status}
                      </Badge>
                    )}
                  </TableCell>
                  {isOwner && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingRecruiter(recruiter);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(recruiter.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <RecruiterForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingRecruiter(undefined); }}
        onSubmit={editingRecruiter ? handleEdit : handleCreate}
        recruiter={editingRecruiter}
      />

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onComplete={() => fetchRecruiters()}
      />
    </div>
  );
}
