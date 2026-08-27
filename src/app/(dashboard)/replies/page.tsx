"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  MailWarning,
  RefreshCw,
  Search,
  Star,
  StarOff,
  MailOpen,
  ArrowLeft,
  Send,
  AlertTriangle,
  CheckCheck,
  Clock,
  Building2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

interface Thread {
  id: string;
  message_id: string | null;
  in_reply_to: string | null;
  thread_id: string | null;
  recruiter_id: string | null;
  direction: "sent" | "received";
  from_email: string;
  to_email: string;
  subject: string | null;
  body_preview: string | null;
  body_html: string | null;
  is_reply: boolean;
  is_bounce: boolean;
  bounce_reason: string | null;
  is_read: boolean;
  starred: boolean;
  received_at: string;
  recruiters?: { id: string; name: string; company: string } | null;
}

interface ThreadDetail {
  thread: Thread;
  conversation: Thread[];
}

export default function RepliesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<"replies" | "bounces" | "all">("replies");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        filter,
        page: String(page),
        limit: "20",
      });
      if (searchDebounced) params.set("search", searchDebounced);

      const res = await fetch(`/api/replies?${params}`);
      const data = await res.json();

      if (res.ok) {
        setThreads(data.threads);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      toast.add({ title: "Failed to load replies", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [filter, page, searchDebounced]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Reset page when filter/search changes
  useEffect(() => {
    setPage(1);
  }, [filter, searchDebounced]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/mail-sync", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        toast.add({
          title: `Sync complete: ${data.newReplies} replies, ${data.bounces} bounces`,
          type: "success",
        });
        fetchThreads();
      } else {
        toast.add({ title: data.error || "Sync failed", type: "error" });
      }
    } catch {
      toast.add({ title: "Sync failed", type: "error" });
    } finally {
      setSyncing(false);
    }
  };

  const openThread = async (threadId: string) => {
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/replies/${threadId}`);
      const data = await res.json();

      if (res.ok) {
        setSelectedThread(data);
        // Mark as read in local state
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, is_read: true } : t))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      toast.add({ title: "Failed to load thread", type: "error" });
    } finally {
      setLoadingThread(false);
    }
  };

  const handleReply = async () => {
    if (!selectedThread || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/replies/${selectedThread.thread.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.add({ title: `Reply sent to ${data.to}`, type: "success" });
        setReplyText("");
        // Refresh conversation
        openThread(selectedThread.thread.id);
      } else {
        toast.add({ title: data.error || "Failed to send", type: "error" });
      }
    } catch {
      toast.add({ title: "Failed to send reply", type: "error" });
    } finally {
      setSendingReply(false);
    }
  };

  const toggleStar = async (threadId: string, currentlyStarred: boolean) => {
    const action = currentlyStarred ? "unstar" : "star";
    await fetch("/api/replies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [threadId], action }),
    });
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, starred: !currentlyStarred } : t))
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) {
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return d.toLocaleDateString("en-US", { weekday: "short" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Thread detail view
  if (selectedThread) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedThread(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">
              {selectedThread.thread.subject || "(No subject)"}
            </h2>
            {selectedThread.thread.recruiters && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {selectedThread.thread.recruiters.name} at{" "}
                {selectedThread.thread.recruiters.company}
              </p>
            )}
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="space-y-3">
          {selectedThread.conversation.map((msg) => (
            <Card
              key={msg.id}
              className={cn(
                "transition-all",
                msg.direction === "sent"
                  ? "ml-8 border-emerald-500/20 bg-emerald-500/5"
                  : "mr-8"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium",
                        msg.direction === "sent"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-blue-500/20 text-blue-400"
                      )}
                    >
                      {msg.direction === "sent" ? "You" : msg.from_email[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {msg.direction === "sent" ? "You" : msg.from_email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        to {msg.direction === "sent" ? msg.to_email : "you"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.received_at).toLocaleString()}
                  </span>
                </div>
                <div className="pl-9">
                  {msg.body_html ? (
                    <div
                      className="text-sm prose prose-invert prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: msg.body_html }}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.body_preview}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reply Box */}
        <Card className="border-emerald-500/20">
          <CardContent className="p-4 space-y-3">
            <Textarea
              placeholder={`Reply to ${selectedThread.thread.from_email}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleReply}
                disabled={!replyText.trim() || sendingReply}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingReply ? "Sending..." : "Send Reply"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main list view
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Replies
            </span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-emerald-500/20 text-emerald-400">
                {unreadCount} new
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Recruiter responses and bounce notifications
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search replies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="replies">
              <span className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> Replies
              </span>
            </SelectItem>
            <SelectItem value="bounces">
              <span className="flex items-center gap-2">
                <MailWarning className="h-3.5 w-3.5" /> Bounces
              </span>
            </SelectItem>
            <SelectItem value="all">
              <span className="flex items-center gap-2">
                <MailOpen className="h-3.5 w-3.5" /> All
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">
          {total} total
        </Badge>
      </div>

      {/* Thread List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-14 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : threads.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {filter === "replies"
                ? "No replies yet. Sync your inbox or wait for the cron job."
                : filter === "bounces"
                ? "No bounces detected. Your emails are reaching their targets."
                : "No messages found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {threads.map((thread) => (
            <Card
              key={thread.id}
              className={cn(
                "cursor-pointer hover:border-emerald-500/30 transition-all",
                !thread.is_read && "bg-emerald-500/5 border-emerald-500/20"
              )}
              onClick={() => openThread(thread.id)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                {/* Star */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(thread.id, thread.starred);
                  }}
                  className="text-muted-foreground hover:text-yellow-400 transition-colors"
                >
                  {thread.starred ? (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ) : (
                    <StarOff className="h-4 w-4" />
                  )}
                </button>

                {/* Icon */}
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    thread.is_bounce
                      ? "bg-red-500/20 text-red-400"
                      : "bg-blue-500/20 text-blue-400"
                  )}
                >
                  {thread.is_bounce ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm truncate",
                        !thread.is_read ? "font-semibold" : "font-medium"
                      )}
                    >
                      {thread.recruiters?.name || thread.from_email}
                    </span>
                    {thread.recruiters?.company && (
                      <span className="text-xs text-muted-foreground truncate">
                        • {thread.recruiters.company}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-sm truncate",
                      !thread.is_read ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {thread.subject || "(No subject)"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {thread.is_bounce
                      ? thread.bounce_reason || "Delivery failed"
                      : thread.body_preview?.slice(0, 80)}
                  </p>
                </div>

                {/* Meta */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(thread.received_at)}
                  </span>
                  {thread.is_bounce && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      Bounced
                    </Badge>
                  )}
                  {!thread.is_read && !thread.is_bounce && (
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Sync Status Footer */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
        <Clock className="h-3 w-3" />
        <span>Auto-syncs every 5 minutes</span>
        <span>•</span>
        <CheckCheck className="h-3 w-3" />
        <span>{total} messages tracked</span>
      </div>
    </div>
  );
}
