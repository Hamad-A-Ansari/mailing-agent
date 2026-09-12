"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Eye,
  Search,
  Building2,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  Bot,
  ExternalLink,
} from "lucide-react";

interface Visit {
  id: string;
  ip: string;
  path: string;
  referrer: string;
  browser: string;
  os: string;
  device_type: string;
  country: string | null;
  region: string | null;
  city: string | null;
  isp: string | null;
  org: string | null;
  as_name: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

function DeviceIcon({ type }: { type: string }) {
  if (type === "mobile") return <Smartphone className="h-3.5 w-3.5" />;
  if (type === "tablet") return <Tablet className="h-3.5 w-3.5" />;
  if (type === "bot") return <Bot className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

export default function VisitorsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced]);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (searchDebounced) params.set("search", searchDebounced);
      const res = await fetch(`/api/visitors?${params}`);
      const data = await res.json();
      if (res.ok) {
        setVisits(data.visits);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch {
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const formatTime = (s: string) => {
    const d = new Date(s);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const location = (v: Visit) =>
    [v.city, v.region, v.country].filter(Boolean).join(", ") || "Unknown";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6 text-emerald-400" />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Visitors
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Who opened your landing page — organization, location, and device.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {total} visit{total !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by company, city, IP, ISP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : visits.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Eye className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              No visits recorded yet. Share your landing page and watch them roll in.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Referrer</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate max-w-[180px]" title={v.org || v.isp || ""}>
                        {v.org || v.isp || "Unknown"}
                      </span>
                    </div>
                    {v.isp && v.org && v.isp !== v.org && (
                      <span className="text-[11px] text-muted-foreground pl-5">{v.isp}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {v.latitude && v.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                        >
                          {location(v)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm">{location(v)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <DeviceIcon type={v.device_type} />
                      <span>{v.browser}</span>
                      <span className="text-muted-foreground text-xs">· {v.os}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground truncate max-w-[140px] inline-block align-middle">
                      {v.referrer || "Direct"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground">{v.ip}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(v.created_at)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
