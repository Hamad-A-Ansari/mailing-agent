"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Plus, Upload, Download, UserPlus, CheckSquare, Square, ChevronLeft, ChevronRight, Trash2, Loader2, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PublicHRBulkUploadDialog } from "@/components/public-hr/bulk-upload-dialog";

interface HREntry {
  id: string;
  name: string;
  company: string;
  role: string;
  emails: string[];
  created_at: string;
}

export default function PublicHRPage() {
  const [entries, setEntries] = useState<HREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [company, setCompany] = useState<string>("all");
  const [role, setRole] = useState<string>("all");
  const [companies, setCompanies] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Add form state
  const [addName, setAddName] = useState("");
  const [addCompany, setAddCompany] = useState("");
  const [addRole, setAddRole] = useState("Recruiter");
  const [addEmails, setAddEmails] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Bulk upload state

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "30" });
    if (search) params.set("search", search);
    if (company !== "all") params.set("company", company);
    if (role !== "all") params.set("role", role);

    try {
      const res = await fetch(`/api/public-hr?${params}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setCompanies(data.companies || []);
      setIsOwner(data.isOwner || false);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, company, role]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === entries.length) setSelected(new Set());
    else setSelected(new Set(entries.map((e) => e.id)));
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/public-hr/import-to-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (data.success) {
        toast.add({ title: `Imported ${data.imported} contact${data.imported !== 1 ? "s" : ""}${data.skipped ? ` (${data.skipped} duplicates skipped)` : ""}`, type: "success" });
        setSelected(new Set());
      } else {
        toast.add({ title: data.error || "Import failed", type: "error" });
      }
    } catch {
      toast.add({ title: "Import failed", type: "error" });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const csv = [
      "Name,Company,Role,Emails",
      ...entries.map((e) => `"${e.name}","${e.company}","${e.role}","${e.emails.join("; ")}"`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "public-hr-database.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAdd = async () => {
    const emails = addEmails.split(/[\n,]+/).map((e) => e.trim()).filter((e) => e.includes("@"));
    if (!addName || !addCompany || emails.length === 0) {
      toast.add({ title: "Fill all required fields", type: "error" });
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/public-hr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName, company: addCompany, role: addRole, emails }),
      });
      if (res.ok) {
        toast.add({ title: "Added to Public HR Database", type: "success" });
        setAddOpen(false);
        setAddName(""); setAddCompany(""); setAddRole("Recruiter"); setAddEmails("");
        fetchEntries();
      } else {
        const data = await res.json();
        toast.add({ title: data.error || "Failed", type: "error" });
      }
    } catch { toast.add({ title: "Failed", type: "error" }); }
    finally { setAddLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await fetch(`/api/public-hr/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.add({ title: "Deleted", type: "success" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6 text-emerald-400" />
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Public HR Database
          </span>
        </h1>
        <p className="text-muted-foreground">
          {isOwner ? "Manage the shared recruiter database. All users can view and import to their contacts." : "Browse recruiters and import them to your contacts for outreach."}
        </p>
      </div>

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or company..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
        </div>

        <Select value={company} onValueChange={(v) => { setCompany(v || "all"); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Company" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={role} onValueChange={(v) => { setRole(v || "all"); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Recruiter">Recruiter</SelectItem>
            <SelectItem value="Engineering Manager">Eng Manager</SelectItem>
            <SelectItem value="Hiring Manager">Hiring Manager</SelectItem>
            <SelectItem value="Software Developer">Software Dev</SelectItem>
            <SelectItem value="Talent Sourcer">Talent Sourcer</SelectItem>
            <SelectItem value="Director">Director</SelectItem>
            <SelectItem value="VP">VP</SelectItem>
          </SelectContent>
        </Select>

        {/* Import to contacts button */}
        {selected.size > 0 && (
          <Button onClick={handleImport} disabled={importing} size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0">
            {importing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1.5" />}
            Import {selected.size} to Contacts
          </Button>
        )}

        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
        </Button>

        {/* Owner-only actions */}
        {isOwner && (
          <>
            <Button onClick={() => setAddOpen(true)} size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
            </Button>
            <Button onClick={() => setBulkOpen(true)} size="sm" variant="outline">
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Bulk Upload
            </Button>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{total} recruiters in database</span>
        {selected.size > 0 && <Badge variant="secondary">{selected.size} selected</Badge>}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search || company !== "all" ? "No results for these filters." : "No entries yet."}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <button onClick={toggleAll} className="p-1">
                    {selected.size === entries.length ? <CheckSquare className="h-4 w-4 text-emerald-400" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Emails</TableHead>
                {isOwner && <TableHead className="w-10"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className={cn("cursor-pointer hover:bg-muted/50", selected.has(entry.id) && "bg-emerald-500/5")} onClick={() => toggleSelect(entry.id)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleSelect(entry.id)} className="p-1">
                      {selected.has(entry.id) ? <CheckSquare className="h-4 w-4 text-emerald-400" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">{entry.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <img src={`https://www.google.com/s2/favicons?domain=${entry.company.toLowerCase().replace(/\s+/g, "")}.com&sz=16`} alt="" className="h-3.5 w-3.5 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      {entry.company}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{entry.role}</Badge></TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {entry.emails.map((email) => (
                        <p key={email} className="text-xs text-muted-foreground">{email}</p>
                      ))}
                    </div>
                  </TableCell>
                  {isOwner && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDelete(entry.id)} className="p-1 hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </Button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Add Dialog (Owner only) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Add to Public HR Database</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Name *</label><Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Full name" /></div>
              <div><label className="text-xs text-muted-foreground">Company *</label><Input value={addCompany} onChange={(e) => setAddCompany(e.target.value)} placeholder="Company" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Role</label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v || "Recruiter")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Recruiter">Recruiter</SelectItem>
                  <SelectItem value="Engineering Manager">Eng Manager</SelectItem>
                  <SelectItem value="Hiring Manager">Hiring Manager</SelectItem>
                  <SelectItem value="Software Developer">Software Dev</SelectItem>
                  <SelectItem value="Talent Sourcer">Talent Sourcer</SelectItem>
                  <SelectItem value="Director">Director</SelectItem>
                  <SelectItem value="VP">VP</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">Emails * (one per line or comma-separated)</label>
              <textarea value={addEmails} onChange={(e) => setAddEmails(e.target.value)} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="email1@company.com, email2@gmail.com" />
            </div>
            <Button onClick={handleAdd} disabled={addLoading} className="w-full">
              {addLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} Add Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog (Owner only — CSV/Excel) */}
      <PublicHRBulkUploadDialog open={bulkOpen} onClose={() => setBulkOpen(false)} onComplete={fetchEntries} />
    </div>
  );
}
