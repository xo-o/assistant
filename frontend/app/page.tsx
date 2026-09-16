"use client";

import React, { useState, useEffect } from "react";
import { AppSidebar, ChatSessionItem } from "./components/AppSidebar";
import { CleanHeader } from "./components/CleanHeader";
import { CleanChatArea, MessageItem } from "./components/CleanChatArea";
import { LeadPanel, LeadData } from "./components/LeadPanel";
import { HitlModal, HitlTicketData } from "./components/HitlModal";
import { TelemetryModal, TelemetryTrace } from "./components/TelemetryModal";

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [currentModel, setCurrentModel] = useState<string>("gemini-1.5-pro");
  const [lead, setLead] = useState<LeadData | null>(null);
  const [activeHitlTicket, setActiveHitlTicket] = useState<HitlTicketData | null>(null);
  const [hitlCount, setHitlCount] = useState<number>(0);
  const [latestTrace, setLatestTrace] = useState<TelemetryTrace | null>(null);

  // Layout & Modals
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLeadOpen, setIsLeadOpen] = useState(false);
  const [isHitlOpen, setIsHitlOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingDelta, setStreamingDelta] = useState("");

  // Load Sessions List
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

  // Initialize Session
  useEffect(() => {
    const existing = localStorage.getItem("automotive_advisor_session");
    if (existing) {
      setSessionId(existing);
      loadSessionHistory(existing);
    } else {
      handleNewChat();
    }
    fetchSessions();
  }, []);

  // Load Session History when selecting a chat from Recent
  const loadSessionHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/chat/history/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const mapped: MessageItem[] = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt || m.created_at,
            toolsCalled: m.toolCalls ? JSON.parse(typeof m.toolCalls === "string" ? m.toolCalls : JSON.stringify(m.toolCalls)).map((t: any) => t.name) : [],
          }));
          setMessages(mapped);
        } else {
          setMessages([]);
        }
      }

      // Fetch Lead for this session
      const leadRes = await fetch(`http://127.0.0.1:8000/api/v1/leads/${id}`);
      if (leadRes.ok) {
        const leadData = await leadRes.json();
        setLead(leadData);
      } else {
        setLead(null);
      }
    } catch (err) {
      console.error("Failed to load session history:", err);
    }
  };

  // Switch Active Session
  const handleSelectSession = (selectedId: string) => {
    if (selectedId === sessionId) return;
    setSessionId(selectedId);
    localStorage.setItem("automotive_advisor_session", selectedId);
    loadSessionHistory(selectedId);
  };

  // Start New Chat
  const handleNewChat = () => {
    const newId = "sess_" + Math.random().toString(36).substring(2, 11);
    setSessionId(newId);
    localStorage.setItem("automotive_advisor_session", newId);
    setMessages([]);
    setLead(null);
    setActiveHitlTicket(null);
    setHitlCount(0);
  };

  // Send Message with SSE Streaming
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

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
          session_id: sessionId,
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

      // Finalize assistant message
      const assistantMsg: MessageItem = {
        id: "ast_" + Date.now(),
        role: "assistant",
        content: accumulatedText || "Hola, ¿en qué te puedo asesorar?",
        createdAt: new Date().toISOString(),
        toolsCalled: activeTools,
        hitlTicket: currentTicket,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      fetchSessions();
    } catch (err) {
      console.error("Stream error, falling back to JSON:", err);
      try {
        const fallbackRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
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
        }
      } catch (fallbackErr) {
        console.error("Critical error connecting to backend:", fallbackErr);
      }
    } finally {
      setIsStreaming(false);
      setStreamingDelta("");
    }
  };

  // Submit Feedback (👍 / 👎)
  const handleSendFeedback = async (messageId: string, isPositive: boolean) => {
    try {
      await fetch("http://127.0.0.1:8000/api/v1/feedback", {
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
      await fetch(`http://127.0.0.1:8000/api/v1/hitl/tickets/${ticketCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "RESOLVED",
          operator_notes: notes,
        }),
      });

      if (activeHitlTicket && activeHitlTicket.ticket_code === ticketCode) {
        setActiveHitlTicket({ ...activeHitlTicket, status: "RESOLVED" });
      }
      setIsHitlOpen(false);
    } catch (err) {
      console.error("Failed to update HITL ticket:", err);
    }
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground antialiased">
      {/* Sidebar with Recent Chats */}
      <AppSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        sessions={sessions}
        activeSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        userName={lead?.name}
      />

      {/* Main Conversation Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Minimal Header */}
        <CleanHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          leadName={lead?.name}
          hitlCount={hitlCount}
          onOpenLead={() => setIsLeadOpen(true)}
          onOpenHitl={() => setIsHitlOpen(true)}
          onOpenTelemetry={() => setIsTelemetryOpen(true)}
        />

        {/* Clean Chat Canvas & Floating Input Composer */}
        <CleanChatArea
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
        />
      </div>

      {/* Modals & Drawers */}
      <LeadPanel
        isOpen={isLeadOpen}
        onClose={() => setIsLeadOpen(false)}
        lead={lead}
        sessionId={sessionId}
      />

      <HitlModal
        isOpen={isHitlOpen}
        onClose={() => setIsHitlOpen(false)}
        ticket={activeHitlTicket}
        onResolveTicket={handleResolveHitl}
      />

      <TelemetryModal
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        latestTrace={latestTrace}
      />
    </div>
  );
}
