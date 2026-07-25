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
import { Upload } from "lucide-react";

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
  const [results, setResults] = useState<{ inserted: number; failed: number; errors: Array<{ row: number; message: string }> } | null>(null);
  const [importing, setImporting] = useState(false);

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

  const handleImport = async () => {
    if (!mapping.name || !mapping.company || !mapping.email) return;

    setImporting(true);

    const recruiters = rows
      .filter((row) => row[mapping.name!]?.trim() && row[mapping.email!]?.trim())
      .map((row) => ({
        name: row[mapping.name!].trim(),
        company: row[mapping.company!].trim(),
        title: mapping.title ? row[mapping.title]?.trim() || null : null,
        notes: mapping.notes ? row[mapping.notes]?.trim() || null : null,
        emails: [
          {
            email: row[mapping.email!].trim(),
            type: "work",
            is_primary: true,
          },
        ],
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

  const previewRows = rows.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
                onClick={() => setStep("preview")}
                disabled={!mapping.name || !mapping.company || !mapping.email}
              >
                Preview
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preview first 10 rows (of {rows.length} total)
            </p>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Title</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{mapping.name ? row[mapping.name] : ""}</TableCell>
                      <TableCell>{mapping.company ? row[mapping.company] : ""}</TableCell>
                      <TableCell>{mapping.email ? row[mapping.email] : ""}</TableCell>
                      <TableCell>{mapping.title ? row[mapping.title] : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importing..." : `Import ${rows.length} rows`}
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
