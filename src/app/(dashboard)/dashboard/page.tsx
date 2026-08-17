"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Mail, Send, Activity, Columns3, Mic, TrendingUp, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Stats {
  totalRecruiters: number;
  totalEmailsSent: number;
  emailsToday: number;
  emailsThisWeek: number;
  totalApplications: number;
  totalInterviews: number;
  emailChart: Array<{ date: string; emails: number }>;
  stageChart: Array<{ stage: string; count: number }>;
  recentActivity: Array<{ id: string; action: string; created_at: string }>;
}

const stageColors: Record<string, string> = {
  Saved: "#6b7280",
  Applied: "#3b82f6",
  OA: "#a855f7",
  "Phone Screen": "#06b6d4",
  "Technical Interview": "#f97316",
  "Final Round": "#ec4899",
  Offer: "#22c55e",
  Rejected: "#ef4444",
  Accepted: "#10b981",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const formatAction = (action: string) =>
    action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Dashboard
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">Your outreach performance at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/send" className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-medium text-white hover:from-emerald-500 hover:to-teal-500 transition-all">
            <Send className="h-3.5 w-3.5" /> Send Emails
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label="Contacts" value={stats?.totalRecruiters ?? 0} color="emerald" href="/contacts" />
        <StatCard icon={Mail} label="Sent Today" value={stats?.emailsToday ?? 0} color="teal" />
        <StatCard icon={Send} label="This Week" value={stats?.emailsThisWeek ?? 0} color="cyan" />
        <StatCard icon={Activity} label="Total Sent" value={stats?.totalEmailsSent ?? 0} color="emerald" />
        <StatCard icon={Columns3} label="Applications" value={stats?.totalApplications ?? 0} color="blue" href="/applications" />
        <StatCard icon={Mic} label="Interviews" value={stats?.totalInterviews ?? 0} color="violet" href="/interview" />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Email Activity Chart */}
        <Card className="border-emerald-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Emails Sent (14 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {stats?.emailChart && stats.emailChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={stats.emailChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="emailGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
                    labelFormatter={(label) => formatDate(String(label))}
                  />
                  <Area type="monotone" dataKey="emails" stroke="#10b981" fill="url(#emailGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                No email data yet. Start sending outreach.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Stages Chart */}
        <Card className="border-blue-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Columns3 className="h-4 w-4 text-blue-400" />
              Application Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {stats?.stageChart && stats.stageChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.stageChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="stage" tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} interval={0} angle={-15} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.stageChart.map((entry) => (
                      <rect key={entry.stage} fill={stageColors[entry.stage] || "#6b7280"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                No applications yet. Add some from the Kanban board.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity — Clean timeline */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-2">
              {stats.recentActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-400/60" />
                    <span className="text-sm">{formatAction(item.action)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(item.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No activity yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickLink href="/contacts" label="Add Contacts" icon={Users} />
        <QuickLink href="/templates" label="Create Template" icon={Mail} />
        <QuickLink href="/applications" label="Track Apps" icon={Columns3} />
        <QuickLink href="/interview" label="Practice Interview" icon={Mic} />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, href }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  href?: string;
}) {
  const colorClasses: Record<string, string> = {
    emerald: "border-emerald-500/20 text-emerald-400",
    teal: "border-teal-500/20 text-teal-400",
    cyan: "border-cyan-500/20 text-cyan-400",
    blue: "border-blue-500/20 text-blue-400",
    violet: "border-violet-500/20 text-violet-400",
  };

  const content = (
    <Card className={`hover:border-opacity-40 transition-colors ${colorClasses[color]?.split(" ")[0] || ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <Icon className={`h-4 w-4 ${colorClasses[color]?.split(" ")[1] || "text-muted-foreground"}`} />
          {href && <ArrowUpRight className="h-3 w-3 text-muted-foreground" />}
        </div>
        <p className={`text-2xl font-bold ${colorClasses[color]?.split(" ")[1] || ""}`}>{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg border p-3 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
    >
      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
