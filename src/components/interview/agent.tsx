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
      <div className="flex items-center gap-12">
        {/* AI Interviewer */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div
              className={cn(
                "flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20",
                isSpeaking && "border-primary animate-pulse"
              )}
            >
              <Bot className="h-10 w-10 text-primary" />
            </div>
            {isSpeaking && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs text-primary font-medium">
                Speaking...
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-muted-foreground">AI Interviewer</p>
        </div>

        {/* User */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted border-2 border-muted-foreground/20">
            <span className="text-2xl font-bold text-muted-foreground">
              {userName?.charAt(0)?.toUpperCase() || "U"}
            </span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">{userName}</p>
        </div>
      </div>

      {/* Transcript */}
      {messages.length > 0 && (
        <div className="w-full max-w-lg rounded-lg border bg-muted/50 p-4">
          <p
            key={lastMessage}
            className="text-sm text-foreground animate-in fade-in duration-500"
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
              "relative flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors",
              callStatus === CallStatus.CONNECTING && "opacity-70"
            )}
          >
            {callStatus === CallStatus.CONNECTING && (
              <span className="absolute inset-0 animate-ping rounded-full bg-green-600 opacity-75" />
            )}
            <Phone className="h-6 w-6 relative" />
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {callStatus === CallStatus.INACTIVE && "Click to start the call"}
        {callStatus === CallStatus.CONNECTING && "Connecting..."}
        {callStatus === CallStatus.ACTIVE && "Call in progress — click the red button to end"}
        {callStatus === CallStatus.FINISHED && "Processing..."}
      </p>
    </div>
  );
}
