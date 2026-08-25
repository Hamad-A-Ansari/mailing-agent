"use client";

import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface PublicHRBulkUploadProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type ParsedRow = Record<string, string>;

interface ColumnMapping {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  nameType: "full" | "split";
  company: string | null;
  role: string | null;
  emails: string[]; // column names that contain emails
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function PublicHRBulkUploadDialog({ open, onClose, onComplete }: PublicHRBulkUploadProps) {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "results">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: null, firstName: null, lastName: null, nameType: "full",
    company: null, role: null, emails: [],
  });
  const [preview, setPreview] = useState<Array<{ name: string; company: string; role: string; emails: string[] }>>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{ inserted: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const data = result.data as ParsedRow[];
          if (data.length > 0) {
            setHeaders(Object.keys(data[0]));
            setRows(data);
            setStep("map");
          }
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const data = XLSX.utils.sheet_to_json<ParsedRow>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
        if (data.length > 0) {
          setHeaders(Object.keys(data[0]));
          setRows(data);
          setStep("map");
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const buildPreview = () => {
    const hasName = mapping.nameType === "full" ? !!mapping.name : (!!mapping.firstName && !!mapping.lastName);
    if (!hasName || !mapping.company || mapping.emails.length === 0) return;

    const entries = rows.map((row) => {
      let name = "";
      if (mapping.nameType === "full") name = row[mapping.name!]?.trim() || "";
      else name = `${row[mapping.firstName!]?.trim() || ""} ${row[mapping.lastName!]?.trim() || ""}`.trim();

      const company = row[mapping.company!]?.trim() || "";
      const role = mapping.role ? row[mapping.role]?.trim() || "Recruiter" : "Recruiter";

      const emails: string[] = [];
      for (const col of mapping.emails) {
        const val = row[col]?.trim();
        if (val && isValidEmail(val)) emails.push(val.toLowerCase());
      }

      return { name, company, role, emails };
    }).filter((e) => e.name && e.company && e.emails.length > 0);

    setPreview(entries);
    setStep("preview");
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      const res = await fetch("/api/public-hr/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: preview }),
      });
      const data = await res.json();
      if (data.success) {
        setResults({ inserted: data.inserted });
        setStep("results");
        onComplete();
      }
    } catch {}
    finally { setUploading(false); }
  };

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({ name: null, firstName: null, lastName: null, nameType: "full", company: null, role: null, emails: [] });
    setPreview([]);
    setResults(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const toggleEmailColumn = (col: string) => {
    setMapping((m) => ({
      ...m,
      emails: m.emails.includes(col) ? m.emails.filter((c) => c !== col) : [...m.emails, col],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload to Public HR Database</DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload file */}
        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Upload CSV or Excel file</p>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="text-sm" />
            </div>
            <p className="text-xs text-muted-foreground">Columns should include: Name, Company, and at least one Email column.</p>
          </div>
        )}

        {/* Step 2: Map columns */}
        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Found {rows.length} rows and {headers.length} columns. Map them below:</p>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium w-24">Name type:</label>
                <Select value={mapping.nameType} onValueChange={(v) => setMapping({ ...mapping, nameType: v as "full" | "split" })}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Name (1 col)</SelectItem>
                    <SelectItem value="split">First + Last</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mapping.nameType === "full" ? (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium w-24">Name *</label>
                  <Select value={mapping.name || ""} onValueChange={(v) => setMapping({ ...mapping, name: v || null })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>{headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium w-24">First Name *</label>
                    <Select value={mapping.firstName || ""} onValueChange={(v) => setMapping({ ...mapping, firstName: v || null })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>{headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium w-24">Last Name *</label>
                    <Select value={mapping.lastName || ""} onValueChange={(v) => setMapping({ ...mapping, lastName: v || null })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>{headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium w-24">Company *</label>
                <Select value={mapping.company || ""} onValueChange={(v) => setMapping({ ...mapping, company: v || null })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>{headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium w-24">Role</label>
                <Select value={mapping.role || ""} onValueChange={(v) => setMapping({ ...mapping, role: v || null })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="(Optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Email columns * (select all that contain emails)</label>
                <div className="flex flex-wrap gap-2">
                  {headers.map((h) => (
                    <Badge
                      key={h}
                      variant={mapping.emails.includes(h) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleEmailColumn(h)}
                    >
                      {h}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={buildPreview} disabled={
                (mapping.nameType === "full" ? !mapping.name : (!mapping.firstName || !mapping.lastName)) ||
                !mapping.company || mapping.emails.length === 0
              }>Preview</Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{preview.length} valid entries ready to upload.</p>

            <div className="max-h-[300px] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Emails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(0, 50).map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{entry.name}</TableCell>
                      <TableCell className="text-sm">{entry.company}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{entry.role}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entry.emails.join(", ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {preview.length > 50 && <p className="text-xs text-muted-foreground">Showing first 50 of {preview.length}</p>}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("map")}>Back</Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload {preview.length} entries
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === "results" && results && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
            <p className="text-lg font-semibold">{results.inserted} entries uploaded</p>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
