"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer, generator } from "@/constants/interview";
import { createFeedback } from "@/lib/actions/interview";
import type { AgentProps } from "@/types/interview";
import type { AssistantOverrides } from "@vapi-ai/web/dist/api";
import { Bot, Phone, PhoneOff } from "lucide-react";

// SDK types declare clientMessages/serverMessages as single value (upstream bug).
type ClientMessageType = AssistantOverrides["clientMessages"];
type ServerMessageType = AssistantOverrides["serverMessages"];

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

export function Agent({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
  prefillCompany,
  prefillRole,
}: AgentProps) {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");

  useEffect(() => {
    const onCallStart = () => setCallStatus(CallStatus.ACTIVE);
    const onCallEnd = () => setCallStatus(CallStatus.FINISHED);

    const onMessage = (message: unknown) => {
      const msg = message as { type?: string; transcriptType?: string; role?: string; transcript?: string };
      if (msg.type === "transcript" && msg.transcriptType === "final") {
        const newMessage = { role: msg.role as SavedMessage["role"], content: msg.transcript! };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);
    const onError = (error: Error) => console.error("Vapi error:", error);

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }

    const handleGenerateFeedback = async (msgs: SavedMessage[]) => {
      const { success, feedbackId: id } = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: msgs,
        feedbackId,
      });

      if (success && id) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        console.error("Error saving feedback");
        router.push("/interview");
      }
    };

    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        router.push("/interview");
      } else {
        handleGenerateFeedback(messages);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, callStatus]);

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);

    if (type === "generate") {
      await vapi.start(generator, {
        variableValues: {
          username: userName,
          userid: userId,
          ...(prefillCompany && { prefill_company: prefillCompany }),
          ...(prefillRole && { prefill_role: prefillRole }),
        },
        clientMessages: ["transcript"] as unknown as ClientMessageType,
        serverMessages: [] as unknown as ServerMessageType,
      });
    } else {
      let formattedQuestions = "";
      if (questions) {
        formattedQuestions = questions
          .map((question) => `- ${question}`)
          .join("\n");
      }

      await vapi.start(interviewer, {
        variableValues: {
          questions: formattedQuestions,
        },
        clientMessages: ["transcript"] as unknown as ClientMessageType,
        serverMessages: [] as unknown as ServerMessageType,
      });
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Avatars */}
      <div className="flex items-center gap-16">
        {/* AI Interviewer */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div
              className={cn(
                "flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border-2 border-violet-500/30",
                isSpeaking && "border-violet-400 shadow-lg shadow-violet-500/20"
              )}
            >
              <Bot className={cn("h-12 w-12 text-violet-400 transition-transform", isSpeaking && "scale-110")} />
            </div>
            {isSpeaking && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-violet-500/20 border border-violet-500/30 px-2.5 py-0.5 text-xs text-violet-300 font-medium">
                Speaking...
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-violet-300">AI Interviewer</p>
        </div>

        {/* Connector */}
        <div className="flex flex-col items-center gap-1">
          <div className="h-px w-12 bg-gradient-to-r from-violet-500/50 to-indigo-500/50" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">live</span>
          <div className="h-px w-12 bg-gradient-to-r from-indigo-500/50 to-violet-500/50" />
        </div>

        {/* User */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/30">
            <span className="text-3xl font-bold text-emerald-400">
              {userName?.charAt(0)?.toUpperCase() || "U"}
            </span>
          </div>
          <p className="text-sm font-medium text-emerald-300">{userName}</p>
        </div>
      </div>

      {/* Transcript */}
      {messages.length > 0 && (
        <div className="w-full max-w-lg rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 backdrop-blur-sm">
          <p
            key={lastMessage}
            className="text-sm text-foreground/90 leading-relaxed animate-in fade-in duration-500"
          >
            {lastMessage}
          </p>
        </div>
      )}

      {/* Call Controls */}
      <div className="flex justify-center">
        {callStatus !== CallStatus.ACTIVE ? (
          <button
            onClick={handleCall}
            disabled={callStatus === CallStatus.CONNECTING}
            className={cn(
              "relative flex h-18 w-18 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/25",
              callStatus === CallStatus.CONNECTING && "opacity-70 animate-pulse"
            )}
          >
            {callStatus === CallStatus.CONNECTING && (
              <span className="absolute inset-0 animate-ping rounded-full bg-green-500 opacity-50" />
            )}
            <Phone className="h-7 w-7 relative" />
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="flex h-18 w-18 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white hover:from-red-400 hover:to-rose-500 transition-all shadow-lg shadow-red-500/25"
          >
            <PhoneOff className="h-7 w-7" />
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {callStatus === CallStatus.INACTIVE && "Click to start the call"}
        {callStatus === CallStatus.CONNECTING && "Connecting..."}
        {callStatus === CallStatus.ACTIVE && "Call in progress — click the red button to end"}
        {callStatus === CallStatus.FINISHED && "Generating feedback..."}
      </p>
    </div>
  );
}
