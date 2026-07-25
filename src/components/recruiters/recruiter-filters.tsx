"use client";

import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Upload, Download, Search } from "lucide-react";

interface RecruiterFiltersProps {
  userRole: "owner" | "viewer";
  companies: string[];
  onSearchChange: (search: string) => void;
  onCompanyChange: (company: string | null) => void;
  onStatusChange: (status: string | null) => void;
  onAddClick: () => void;
  onBulkUploadClick: () => void;
  onExportClick: () => void;
}

export function RecruiterFilters({
  userRole,
  companies,
  onSearchChange,
  onCompanyChange,
  onStatusChange,
  onAddClick,
  onBulkUploadClick,
  onExportClick,
}: RecruiterFiltersProps) {
  const [searchValue, setSearchValue] = useState("");
  const isOwner = userRole === "owner";

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      const timeout = setTimeout(() => onSearchChange(value), 300);
      return () => clearTimeout(timeout);
    },
    [onSearchChange]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or company..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select onValueChange={(v) => { const val = v as string; onCompanyChange(val === "all" ? null : val); }}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Companies" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Companies</SelectItem>
          {companies.map((company) => (
            <SelectItem key={company} value={company}>
              {company}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select onValueChange={(v) => { const val = v as string; onStatusChange(val === "all" ? null : val); }}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="Mailed">Mailed</SelectItem>
          <SelectItem value="Follow Up">Follow Up</SelectItem>
          <SelectItem value="Replied">Replied</SelectItem>
          <SelectItem value="No Response">No Response</SelectItem>
        </SelectContent>
      </Select>

      {isOwner && (
        <>
          <Button onClick={onAddClick} size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Add Recruiter
          </Button>
          <Button onClick={onBulkUploadClick} variant="outline" size="sm">
            <Upload className="mr-1 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={onExportClick} variant="outline" size="sm">
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
        </>
      )}
    </div>
  );
}
