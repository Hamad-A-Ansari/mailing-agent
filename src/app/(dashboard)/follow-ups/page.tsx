"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { format } from "date-fns";
import { Clock, Send, XCircle, CheckCircle2, CalendarClock, Loader2, Trash2 } from "lucide-react";

interface FollowUp {
  id: string;
  recruiterId: string;
  email: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  errorMessage: string | null;
  recruiterName: string;
  company: string;
  createdAt: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "scheduled":
      return <Badge variant="outline" className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />Scheduled</Badge>;
    case "sent":
      return <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Sent</Badge>;
    case "failed":
      return <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]"><XCircle className="h-2.5 w-2.5 mr-1" />Failed</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">Cancelled</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
  }
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    const params = filter !== "all" ? `?status=${filter}` : "";
    try {
      const res = await fetch(`/api/follow-ups${params}`);
      const data = await res.json();
      setFollowUps(data.followUps || []);
    } catch {
      setFollowUps([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchFollowUps(); }, [fetchFollowUps]);

  const handleCancel = async (id: string) => {
    const res = await fetch(`/api/follow-ups?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setFollowUps((prev) => prev.map((f) => f.id === id ? { ...f, status: "cancelled" } : f));
      toast.add({ title: "Follow-up cancelled", type: "success" });
    }
  };

  const scheduled = followUps.filter((f) => f.status === "scheduled");
  const sent = followUps.filter((f) => f.status === "sent");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarClock className="h-6 w-6 text-emerald-400" />
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Follow-ups
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Scheduled email follow-ups for your outreach contacts.
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-2">
          <p className="text-xs text-muted-foreground">Scheduled</p>
          <p className="text-lg font-bold text-blue-400">{scheduled.length}</p>
        </div>
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-2">
          <p className="text-xs text-muted-foreground">Sent</p>
          <p className="text-lg font-bold text-green-400">{sent.length}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["all", "scheduled", "sent", "failed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
              filter === f
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        </div>
      ) : followUps.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No follow-ups yet. Schedule one from the Send page or contact detail.
        </div>
      ) : (
        <div className="space-y-2">
          {followUps.map((followUp) => (
            <div key={followUp.id} className="flex items-center justify-between rounded-lg border bg-card p-4 hover:border-emerald-500/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{followUp.recruiterName}</span>
                  {followUp.company && <span className="text-xs text-muted-foreground">at {followUp.company}</span>}
                  {getStatusBadge(followUp.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{followUp.subject}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <Send className="h-2.5 w-2.5 inline mr-1" />
                  {followUp.email} · {format(new Date(followUp.scheduledAt), "MMM d, yyyy h:mm a")}
                </p>
                {followUp.errorMessage && (
                  <p className="text-xs text-red-400 mt-1">{followUp.errorMessage}</p>
                )}
              </div>
              {followUp.status === "scheduled" && (
                <button onClick={() => handleCancel(followUp.id)} className="rounded p-1.5 hover:bg-muted transition-colors ml-2" title="Cancel">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
