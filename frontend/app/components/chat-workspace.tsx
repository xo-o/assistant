"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar, ChatSessionItem } from "./app-sidebar";
import { ChatHeader } from "./chat-header";
import { ChatView, MessageItem } from "./chat-view";
import { LeadDrawer, LeadData } from "./lead-drawer";
import { HitlDialog, HitlTicketData } from "./hitl-dialog";
import { TelemetryDialog, TelemetryTrace } from "./telemetry-dialog";

export interface ChatWorkspaceProps {
  initialSessionId?: string;
}

export function ChatWorkspace({ initialSessionId }: ChatWorkspaceProps) {
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string>(initialSessionId || "");
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [currentModel, setCurrentModel] = useState<string>("gemini-3.8-flash");
  const [lead, setLead] = useState<LeadData | null>(null);
  const [activeHitlTicket, setActiveHitlTicket] = useState<HitlTicketData | null>(null);
  const [hitlCount, setHitlCount] = useState<number>(0);
  const [latestTrace, setLatestTrace] = useState<TelemetryTrace | null>(null);

  // Layout & Modals
  const [isLeadOpen, setIsLeadOpen] = useState(false);
  const [isHitlOpen, setIsHitlOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingDelta, setStreamingDelta] = useState("");

  // Load Sessions List for Sidebar
  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/chat/sessions");
      if (res.ok) {
        const data = await res.json();
        if (data.sessions) {
          setSessions(data.sessions);
        }
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  // Load Session History and Metadata (Strictly Isolated to the given ID)
  const loadSession = async (id: string) => {
    try {
      // 1. Fetch chat history
      const res = await fetch(`/api/chat/history/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const mapped: MessageItem[] = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt || m.created_at,
            toolsCalled: m.toolCalls
              ? JSON.parse(
                  typeof m.toolCalls === "string" ? m.toolCalls : JSON.stringify(m.toolCalls)
                ).map((t: any) => t.name)
              : [],
          }));
          setMessages(mapped);
        } else {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }

      // 2. Fetch Lead for this specific session
      const leadRes = await fetch(`/api/lead/${id}`);
      if (leadRes.ok) {
        const leadData = await leadRes.json();
        setLead(leadData);
      } else {
        setLead(null);
      }

      // 3. Fetch HITL tickets for this specific session
      const hitlRes = await fetch(`/api/hitl?session_id=${id}`);
      if (hitlRes.ok) {
        const hitlData = await hitlRes.json();
        if (hitlData.tickets && hitlData.tickets.length > 0) {
          const active =
            hitlData.tickets.find(
              (t: any) => t.status === "PENDING" || t.status === "IN_PROGRESS"
            ) || hitlData.tickets[0];
          setActiveHitlTicket(active);
          setHitlCount(
            hitlData.tickets.filter((t: any) => t.status === "PENDING").length
          );
        } else {
          setActiveHitlTicket(null);
          setHitlCount(0);
        }
      } else {
        setActiveHitlTicket(null);
        setHitlCount(0);
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  };

  // Synchronize when initialSessionId changes or on initial mount
  useEffect(() => {
    fetchSessions();

    if (initialSessionId) {
      setSessionId(initialSessionId);
      // Reset states immediately before loading to prevent any cross-session flicker
      setMessages([]);
      setLead(null);
      setActiveHitlTicket(null);
      setHitlCount(0);
      setLatestTrace(null);
      setIsStreaming(false);
      setStreamingDelta("");

      loadSession(initialSessionId);
    } else {
      // Root "/" - Clean slate for new consultation
      setSessionId("");
      setMessages([]);
      setLead(null);
      setActiveHitlTicket(null);
      setHitlCount(0);
      setLatestTrace(null);
      setIsStreaming(false);
      setStreamingDelta("");
    }
  }, [initialSessionId]);

  // Navigate to Selected Session
  const handleSelectSession = (selectedId: string) => {
    if (selectedId === sessionId) return;
    router.push(`/${selectedId}`);
  };

  // Start New Chat (Navigates to root "/")
  const handleNewChat = () => {
    router.push("/");
  };

  // Send Message with SSE Streaming
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    // Determine target session ID: use existing or generate fresh one for new chat
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      targetSessionId = "sess_" + Math.random().toString(36).substring(2, 11);
      setSessionId(targetSessionId);
      // Seamlessly update the URL to /:id without unmounting or interrupting the stream
      window.history.pushState(null, "", `/${targetSessionId}`);
    }

    const userMessage: MessageItem = {
      id: "usr_" + Date.now(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingDelta("");

    let accumulatedText = "";
    const activeTools: string[] = [];
    let currentTicket: HitlTicketData | null = null;

    try {
      const response = await fetch("/api/chat?stream=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: targetSessionId,
          message: text,
          model: currentModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status} from backend`);
      }

      if (!response.body) {
        throw new Error("No response body received");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const eventMatch = block.match(/event:\s*([^\n]+)/);
          const dataMatch = block.match(/data:\s*([^\n]+)/);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1].trim();
            const data = JSON.parse(dataMatch[1].trim());

            if (eventType === "text_delta") {
              accumulatedText += data.text;
              setStreamingDelta(accumulatedText);
            } else if (eventType === "tool_call") {
              if (!activeTools.includes(data.name)) {
                activeTools.push(data.name);
              }
            } else if (eventType === "hitl_interrupt") {
              currentTicket = data;
              setActiveHitlTicket(data);
              setHitlCount((c) => c + 1);
            } else if (eventType === "lead_update") {
              setLead(data);
            } else if (eventType === "telemetry") {
              setLatestTrace(data);
            }
          }
        }
      }

      if (!accumulatedText.trim()) {
        throw new Error("Stream returned no text tokens, falling back to JSON");
      }

      // Finalize assistant message
      const assistantMsg: MessageItem = {
        id: "ast_" + Date.now(),
        role: "assistant",
        content: accumulatedText,
        createdAt: new Date().toISOString(),
        toolsCalled: activeTools,
        hitlTicket: currentTicket,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      fetchSessions();
    } catch (err) {
      console.warn("Stream error, falling back to JSON:", err);
      try {
        const fallbackRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: targetSessionId,
            message: text,
            model: currentModel,
          }),
        });

        const fallbackData = await fallbackRes.json();
        if (fallbackData.message) {
          const assistantMsg: MessageItem = {
            id: fallbackData.message.id || "ast_" + Date.now(),
            role: "assistant",
            content: fallbackData.message.content,
            createdAt: fallbackData.message.createdAt,
            toolsCalled: fallbackData.telemetry?.toolsCalled?.map((t: any) => t.name),
            hitlTicket: fallbackData.hitl,
          };

          if (fallbackData.lead) setLead(fallbackData.lead);
          if (fallbackData.hitl) {
            setActiveHitlTicket(fallbackData.hitl);
            setHitlCount((c) => c + 1);
          }
          if (fallbackData.telemetry) setLatestTrace(fallbackData.telemetry);

          setMessages((prev) => [...prev, assistantMsg]);
          fetchSessions();
        } else {
          throw new Error("No message received from fallback");
        }
      } catch (fallbackErr) {
        console.error("Critical error connecting to backend:", fallbackErr);
        const errorMsg: MessageItem = {
          id: "err_" + Date.now(),
          role: "assistant",
          content: "Disculpa, hubo un inconveniente de conexión con el asesor. Por favor intenta enviar tu mensaje nuevamente.",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingDelta("");
    }
  };

  // Submit Feedback (👍 / 👎)
  const handleSendFeedback = async (messageId: string, isPositive: boolean) => {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message_id: messageId,
          is_positive: isPositive,
        }),
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, feedbackGiven: true } : msg
        )
      );
    } catch (err) {
      console.error("Failed to send feedback:", err);
    }
  };

  // Resolve HITL ticket
  const handleResolveHitl = async (ticketCode: string, notes: string) => {
    try {
      await fetch(`/api/hitl/${ticketCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "RESOLVED",
          operator_notes: notes,
        }),
      });

      if (
        activeHitlTicket &&
        (activeHitlTicket.ticket_code === ticketCode ||
          activeHitlTicket.ticketCode === ticketCode)
      ) {
        setActiveHitlTicket({ ...activeHitlTicket, status: "RESOLVED" });
      }
      setIsHitlOpen(false);
    } catch (err) {
      console.error("Failed to update HITL ticket:", err);
    }
  };

  // Update Contact Info
  const handleUpdateContact = async (contact: string) => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/lead/${sessionId}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_channel: contact }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.lead) {
          setLead(data.lead);
        }
        if (data.ticket) {
          setActiveHitlTicket(data.ticket);
        }
      }
    } catch (err) {
      console.error("Failed to update contact channel:", err);
    }
  };

  const activeSession = sessions.find((s) => s.id === sessionId);
  const activeChatTitle =
    activeSession?.title ||
    (messages.length > 0
      ? messages.find((m) => m.role === "user")?.content || messages[0].content
      : "Nueva Consulta");

  return (
    <div className="dark font-sans flex h-dvh w-screen overflow-hidden bg-background text-foreground select-none">
      {/* Sidebar with Recent Chats */}
      <AppSidebar
        sessions={sessions}
        activeSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
      />

      {/* Main Conversation Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Chat Header Toolbar */}
        <ChatHeader
          chatTitle={activeChatTitle}
          leadName={lead?.name}
          hitlCount={hitlCount}
          onOpenLead={() => setIsLeadOpen(true)}
          onOpenHitl={() => setIsHitlOpen(true)}
          onOpenTelemetry={() => setIsTelemetryOpen(true)}
          onNewChat={handleNewChat}
        />

        {/* Chat Conversation View & Floating Input Composer */}
        <ChatView
          messages={messages}
          onSendMessage={handleSendMessage}
          onSendFeedback={handleSendFeedback}
          onOpenHitlTicket={(ticket) => {
            setActiveHitlTicket(ticket);
            setIsHitlOpen(true);
          }}
          isStreaming={isStreaming}
          streamingDelta={streamingDelta}
          currentModel={currentModel}
          onModelChange={setCurrentModel}
          onOpenLead={() => setIsLeadOpen(true)}
          leadName={lead?.name}
          contactChannel={lead?.contactChannel || (lead as any)?.contact_channel}
          onUpdateContact={handleUpdateContact}
        />
      </div>

      {/* Modals, Drawers & Dialogs */}
      <LeadDrawer
        isOpen={isLeadOpen}
        onClose={() => setIsLeadOpen(false)}
        lead={lead}
        sessionId={sessionId}
      />

      <HitlDialog
        isOpen={isHitlOpen}
        onClose={() => setIsHitlOpen(false)}
        ticket={activeHitlTicket}
        onResolveTicket={handleResolveHitl}
        contactChannel={lead?.contactChannel || (lead as any)?.contact_channel}
        onUpdateContact={handleUpdateContact}
      />

      <TelemetryDialog
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        latestTrace={latestTrace}
      />
    </div>
  );
}
