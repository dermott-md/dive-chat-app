"use client";

import { useState } from "react";
import { MessageCircle, X, Sparkles } from "lucide-react";
import { ChatPanel } from "./ChatPanel";
import { useChat } from "./useChat";

interface ChatBubbleProps {
  /** Optional hint passed to the backend about what the user is viewing. */
  context?: string;
  suggestions?: string[];
}

/** Floating, collapsible "ask a follow-up" chat anchored to the bottom-right. */
export function ChatBubble({ context, suggestions }: ChatBubbleProps) {
  const [open, setOpen] = useState(false);
  const chat = useChat({
    endpoint: "/api/chat",
    body: () => (context ? { context } : {}),
  });

  if (!open) {
    return (
      <button className="bubble-fab" onClick={() => setOpen(true)} aria-label="Ask about this data">
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="bubble-panel">
      <div className="bubble-head">
        <div className="bubble-head-title">
          <span className="bubble-head-icon">
            <Sparkles size={15} />
          </span>
          Ask about this data
        </div>
        <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <ChatPanel
        messages={chat.messages}
        isStreaming={chat.isStreaming}
        onSend={chat.send}
        placeholder="Ask a follow-up question…"
        suggestions={chat.messages.length === 0 ? suggestions : undefined}
      />
    </div>
  );
}
