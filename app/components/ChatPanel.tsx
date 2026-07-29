"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Database } from "lucide-react";
import { Markdown } from "./Markdown";
import type { ChatMessage } from "./useChat";

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSend: (text: string) => void;
  placeholder?: string;
  emptyTitle?: string;
  emptyText?: string;
  suggestions?: string[];
}

export function ChatPanel({
  messages,
  isStreaming,
  onSend,
  placeholder = "Ask a question…",
  emptyTitle,
  emptyText,
  suggestions = [],
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = () => {
    if (!input.trim() || isStreaming) return;
    onSend(input);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const autosize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  return (
    <div className="chat">
      <div className="chat-log" ref={logRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <Database size={22} style={{ opacity: 0.5 }} />
            <div style={{ marginTop: 8, fontWeight: 600, color: "var(--ink)" }}>
              {emptyTitle || "Ask about your data"}
            </div>
            <div style={{ marginTop: 4 }}>{emptyText || "I can query your MotherDuck data to answer follow-up questions."}</div>
            {suggestions.length > 0 && (
              <div className="chat-suggestions">
                {suggestions.map((s) => (
                  <button key={s} className="suggestion" onClick={() => onSend(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((m, i) => <Message key={i} msg={m} streaming={isStreaming && i === messages.length - 1} />)
        )}
      </div>

      <div className="chat-input-row">
        <textarea
          ref={taRef}
          className="chat-input"
          rows={1}
          value={input}
          placeholder={placeholder}
          onChange={autosize}
          onKeyDown={onKey}
          disabled={isStreaming}
        />
        <button className="chat-send" onClick={submit} disabled={isStreaming || !input.trim()} aria-label="Send">
          {isStreaming ? <Loader2 size={18} className="spin-svg" /> : <ArrowUp size={18} />}
        </button>
      </div>
    </div>
  );
}

function Message({ msg, streaming }: { msg: ChatMessage; streaming: boolean }) {
  if (msg.role === "user") {
    return (
      <div className="msg msg-user">
        <div className="msg-bubble">{msg.content}</div>
      </div>
    );
  }

  return (
    <div className="msg msg-assistant">
      {msg.activities.map((a, i) => (
        <div key={i} className={`activity ${a.tool === "query" ? "activity-sql" : ""}`}>
          {a.tool === "query" ? (
            <>
              <span style={{ fontWeight: 600 }}>Running SQL</span>
              <code>{a.summary}</code>
            </>
          ) : (
            <>
              <Loader2 size={12} className="spin-svg" />
              <span>{a.summary}</span>
            </>
          )}
        </div>
      ))}
      {msg.content ? (
        <div className="msg-bubble">
          <Markdown>{msg.content}</Markdown>
        </div>
      ) : streaming ? (
        <div className="msg-bubble">
          <ThinkingDots />
        </div>
      ) : null}
    </div>
  );
}

function ThinkingDots() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 13 }}>
      <Loader2 size={14} className="spin-svg" /> Thinking…
    </span>
  );
}
