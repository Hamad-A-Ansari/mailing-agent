"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Trash2, AlertTriangle, Pencil } from "lucide-react";

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type ColumnMapping = {
  name: string | null;
  company: string | null;
  title: string | null;
  email: string | null;
  notes: string | null;
};

type ParsedRow = Record<string, string>;

interface PreviewEntry {
  id: number;
  name: string;
  company: string;
  email: string;
  title: string;
  notes: string;
  emailValid: boolean;
  isDuplicate: boolean;
  editing: boolean;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function BulkUploadDialog({
  open,
  onClose,
  onComplete,
}: BulkUploadDialogProps) {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "results">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: null,
    company: null,
    title: null,
    email: null,
    notes: null,
  });
  const [entries, setEntries] = useState<PreviewEntry[]>([]);
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<{ inserted: number; failed: number; errors: Array<{ row: number; message: string }> } | null>(null);
  const [importing, setImporting] = useState(false);

  // Fetch existing emails for dedup check
  useEffect(() => {
    if (open) {
      fetch("/api/recruiters?pageSize=10000")
        .then((r) => r.json())
        .then((data) => {
          const emails = new Set<string>();
          for (const r of data.recruiters || []) {
            for (const e of r.recruiter_emails || []) {
              emails.add(e.email.toLowerCase());
            }
          }
          setExistingEmails(emails);
        });
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
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
    } else if (extension === "xlsx" || extension === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const workbook = XLSX.read(evt.target?.result, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: "" });
        if (data.length > 0) {
          setHeaders(Object.keys(data[0]));
          setRows(data);
          setStep("map");
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const buildPreviewEntries = () => {
    if (!mapping.name || !mapping.company || !mapping.email) return;

    const processed: PreviewEntry[] = rows
      .filter((row) => row[mapping.name!]?.trim())
      .map((row, i) => {
        const email = row[mapping.email!]?.trim() || "";
        return {
          id: i,
          name: row[mapping.name!].trim(),
          company: row[mapping.company!]?.trim() || "",
          email,
          title: mapping.title ? row[mapping.title]?.trim() || "" : "",
          notes: mapping.notes ? row[mapping.notes]?.trim() || "" : "",
          emailValid: email ? isValidEmail(email) : false,
          isDuplicate: email ? existingEmails.has(email.toLowerCase()) : false,
          editing: false,
        };
      });

    setEntries(processed);
    setStep("preview");
  };

  const updateEntry = (id: number, field: keyof PreviewEntry, value: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated = { ...e, [field]: value };
        if (field === "email") {
          updated.emailValid = isValidEmail(value);
          updated.isDuplicate = existingEmails.has(value.toLowerCase());
        }
        return updated;
      })
    );
  };

  const toggleEdit = (id: number) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, editing: !e.editing } : e))
    );
  };

  const removeEntry = (id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const invalidCount = entries.filter((e) => !e.emailValid).length;
  const duplicateCount = entries.filter((e) => e.isDuplicate).length;
  const validEntries = entries.filter((e) => e.emailValid && !e.isDuplicate);

  const handleImport = async () => {
    if (validEntries.length === 0) return;

    setImporting(true);

    const recruiters = validEntries.map((e) => ({
      name: e.name,
      company: e.company,
      title: e.title || null,
      notes: e.notes || null,
      emails: [{ email: e.email, type: "work", is_primary: true }],
    }));

    const res = await fetch("/api/recruiters/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recruiters }),
    });

    const data = await res.json();
    setResults(data);
    setStep("results");
    setImporting(false);
  };

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setEntries([]);
    setMapping({ name: null, company: null, title: null, email: null, notes: null });
    setResults(null);
  };

  const handleClose = () => {
    reset();
    onClose();
    if (results && results.inserted > 0) {
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[70vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Recruiters</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Upload a CSV or Excel file with recruiter data
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="text-sm"
            />
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Map your file columns to recruiter fields ({rows.length} rows detected)
            </p>
            {(["name", "company", "email", "title", "notes"] as const).map((field) => (
              <div key={field} className="flex items-center gap-4">
                <span className="w-24 text-sm font-medium capitalize">
                  {field} {field !== "title" && field !== "notes" && "*"}
                </span>
                <Select
                  value={mapping[field] ?? undefined}
                  onValueChange={(v) =>
                    setMapping((prev) => ({ ...prev, [field]: v as string }))
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>
                Back
              </Button>
              <Button
                onClick={buildPreviewEntries}
                disabled={!mapping.name || !mapping.company || !mapping.email}
              >
                Preview
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            {/* Warnings */}
            {(invalidCount > 0 || duplicateCount > 0) && (
              <div className="space-y-2">
                {invalidCount > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {invalidCount} row(s) have invalid email addresses (highlighted in red). They will be skipped unless fixed.
                    </AlertDescription>
                  </Alert>
                )}
                {duplicateCount > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {duplicateCount} row(s) have emails that already exist in your database (highlighted in yellow). They will be skipped unless removed or edited.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {entries.length} rows total · {validEntries.length} will be imported
              </p>
            </div>

            <div className="rounded-md border overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={
                        !entry.emailValid
                          ? "bg-destructive/10"
                          : entry.isDuplicate
                            ? "bg-yellow-500/10"
                            : ""
                      }
                    >
                      <TableCell>
                        {entry.editing ? (
                          <Input
                            value={entry.name}
                            onChange={(e) => updateEntry(entry.id, "name", e.target.value)}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <span className="text-sm">{entry.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.editing ? (
                          <Input
                            value={entry.company}
                            onChange={(e) => updateEntry(entry.id, "company", e.target.value)}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <span className="text-sm">{entry.company}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.editing ? (
                          <Input
                            value={entry.email}
                            onChange={(e) => updateEntry(entry.id, "email", e.target.value)}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-xs">{entry.email}</span>
                            {!entry.emailValid && (
                              <Badge variant="destructive" className="text-[10px] px-1">invalid</Badge>
                            )}
                            {entry.isDuplicate && entry.emailValid && (
                              <Badge variant="secondary" className="text-[10px] px-1">exists</Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.editing ? (
                          <Input
                            value={entry.title}
                            onChange={(e) => updateEntry(entry.id, "title", e.target.value)}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <span className="text-sm">{entry.title || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-muted"
                            onClick={() => toggleEdit(entry.id)}
                            title={entry.editing ? "Done" : "Edit"}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-muted"
                            onClick={() => removeEntry(entry.id)}
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing || validEntries.length === 0}>
                {importing ? "Importing..." : `Import ${validEntries.length} rows`}
              </Button>
            </div>
          </div>
        )}

        {step === "results" && results && (
          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <Badge variant="default" className="text-sm">
                {results.inserted} imported
              </Badge>
              {results.failed > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {results.failed} failed
                </Badge>
              )}
            </div>
            {results.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Errors:</p>
                {results.errors.slice(0, 10).map((err, i) => (
                  <p key={i} className="text-xs text-destructive">
                    Row {err.row}: {err.message}
                  </p>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
