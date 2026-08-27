"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { Mail, Send, ChevronDown, ChevronRight, Reply, Loader2, Clock, CalendarClock } from "lucide-react";

interface EmailItem {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  messageId: string | null;
  sentAt: string;
}

interface Thread {
  recruiterId: string;
  recruiterName: string;
  company: string;
  emails: EmailItem[];
}

export default function SentPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // email log ID
  const [replyBody, setReplyBody] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  // Schedule follow-up state
  const [schedulingFor, setSchedulingFor] = useState<{ emailId: string; toEmail: string; recruiterId: string; subject: string } | null>(null);
  const [scheduleBody, setScheduleBody] = useState("");
  const [scheduleSubject, setScheduleSubject] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    fetch("/api/email-threads")
      .then((r) => r.json())
      .then((data) => setThreads(data.threads || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleReply = async (emailLogId: string) => {
    if (!replyBody.trim()) return;
    setSendingReply(true);

    try {
      const res = await fetch("/api/send-emails/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailLogId,
          body: replyBody,
          subject: replySubject.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.add({ title: "Follow-up sent (threaded)", type: "success" });
        setReplyingTo(null);
        setReplyBody("");
        setReplySubject("");
        // Refresh
        const refreshRes = await fetch("/api/email-threads");
        const refreshData = await refreshRes.json();
        setThreads(refreshData.threads || []);
      } else {
        toast.add({ title: data.error || "Failed to send", type: "error" });
      }
    } catch {
      toast.add({ title: "Something went wrong", type: "error" });
    } finally {
      setSendingReply(false);
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!schedulingFor || !scheduleBody.trim() || !scheduleDate) return;
    setScheduling(true);

    try {
      const res = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruiterId: schedulingFor.recruiterId,
          email: schedulingFor.toEmail,
          subject: scheduleSubject || `Re: ${schedulingFor.subject}`,
          body: scheduleBody,
          scheduledAt: new Date(scheduleDate).toISOString(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.add({ title: `Follow-up scheduled for ${format(new Date(scheduleDate), "MMM d, h:mm a")}`, type: "success" });
        setSchedulingFor(null);
        setScheduleBody("");
        setScheduleSubject("");
        setScheduleDate("");
      } else {
        toast.add({ title: data.error || "Failed to schedule", type: "error" });
      }
    } catch {
      toast.add({ title: "Something went wrong", type: "error" });
    } finally {
      setScheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Sent Emails</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6 text-emerald-400" />
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Sent Emails
          </span>
        </h1>
        <p className="text-muted-foreground">
          Your email conversations. Click to expand, then reply to create a threaded follow-up.
        </p>
      </div>

      {threads.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No sent emails yet. Send some outreach first.
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => {
            const isExpanded = expandedThread === thread.recruiterId;
            const latestEmail = thread.emails[0];

            return (
              <div key={thread.recruiterId} className="rounded-lg border overflow-hidden">
                {/* Thread header */}
                <button
                  onClick={() => setExpandedThread(isExpanded ? null : thread.recruiterId)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${thread.company.toLowerCase().replace(/\s+/g, "")}.com&sz=16`}
                      alt=""
                      className="h-4 w-4 rounded-sm"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div>
                      <span className="font-medium text-sm">{thread.recruiterName}</span>
                      <span className="text-muted-foreground text-xs ml-2">{thread.company}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {thread.emails.length} email{thread.emails.length > 1 ? "s" : ""}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {latestEmail && format(new Date(latestEmail.sentAt), "MMM d")}
                    </span>
                  </div>
                </button>

                {/* Expanded thread */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 p-4 space-y-3">
                    {thread.emails.map((email) => (
                      <div key={email.id} className="rounded-lg border bg-card p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Send className="h-3 w-3 text-emerald-400" />
                            <span className="text-xs font-medium">To: {email.toEmail}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {format(new Date(email.sentAt), "MMM d, yyyy h:mm a")}
                            </span>
                            <button
                              onClick={() => {
                                if (replyingTo === email.id) {
                                  setReplyingTo(null);
                                } else {
                                  setReplyingTo(email.id);
                                  // Pre-fill subject (add Re: only if not already there)
                                  const subj = email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`;
                                  setReplySubject(subj);
                                  setReplyBody("");
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            >
                              <Reply className="h-3 w-3" />
                              Reply
                            </button>
                            <button
                              onClick={() => {
                                const subj = email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`;
                                setSchedulingFor({
                                  emailId: email.id,
                                  toEmail: email.toEmail,
                                  recruiterId: thread.recruiterId,
                                  subject: email.subject,
                                });
                                setScheduleSubject(subj);
                                setScheduleBody("");
                                setScheduleDate("");
                              }}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-blue-400 hover:bg-blue-500/10 transition-colors"
                            >
                              <CalendarClock className="h-3 w-3" />
                              Schedule
                            </button>
                          </div>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">{email.subject}</p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{email.body}</p>

                        {/* Reply composer */}
                        {replyingTo === email.id && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Replying to this email (full thread will be quoted)
                            </p>
                            <input
                              type="text"
                              value={replySubject}
                              onChange={(e) => setReplySubject(e.target.value)}
                              placeholder={`Re: ${email.subject}`}
                              className="w-full rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                            />
                            <textarea
                              value={replyBody}
                              onChange={(e) => setReplyBody(e.target.value)}
                              placeholder="Write your follow-up..."
                              rows={4}
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => { setReplyingTo(null); setReplyBody(""); setReplySubject(""); }}
                                className="rounded px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleReply(email.id)}
                                disabled={sendingReply || !replyBody.trim()}
                                className="inline-flex items-center gap-1.5 rounded bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50"
                              >
                                {sendingReply ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                Send Follow-up
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      {schedulingFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold">Schedule Follow-up</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              To: {schedulingFor.toEmail}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <input
                  type="text"
                  value={scheduleSubject}
                  onChange={(e) => setScheduleSubject(e.target.value)}
                  className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Message</label>
                <textarea
                  value={scheduleBody}
                  onChange={(e) => setScheduleBody(e.target.value)}
                  placeholder="Write your follow-up message..."
                  rows={5}
                  className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Send at</label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                onClick={() => { setSchedulingFor(null); setScheduleBody(""); setScheduleSubject(""); setScheduleDate(""); }}
                className="rounded px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleFollowUp}
                disabled={scheduling || !scheduleBody.trim() || !scheduleDate}
                className="inline-flex items-center gap-1.5 rounded bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50"
              >
                {scheduling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />}
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
