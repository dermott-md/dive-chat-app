"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Save, Check, Sparkles, PlusCircle } from "lucide-react";
import { ChatPanel } from "../components/ChatPanel";
import { DiveFrame } from "../components/DiveFrame";
import { useChat, type DiveEvent } from "../components/useChat";
import { saveReport } from "@/lib/store";

function BuildPageInner() {
  const params = useSearchParams();
  const [diveId, setDiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string | undefined>(undefined);
  const [nonce, setNonce] = useState(0);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const titleTouched = useRef(false);

  // Resume editing a dive passed from the Saved page (?dive=…&title=…).
  useEffect(() => {
    const d = params.get("dive");
    const t = params.get("title");
    if (d) {
      setDiveId(d);
      if (t) {
        setTitle(t);
        titleTouched.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDive = useCallback((d: DiveEvent) => {
    setDiveId(d.diveId);
    setNonce((n) => n + 1);
    setSaved(false);
    if (d.title && !titleTouched.current) setTitle(d.title);
    if (d.description) setDescription(d.description);
  }, []);

  const chat = useChat({
    endpoint: "/api/build",
    body: () => (diveId ? { currentDiveId: diveId } : {}),
    onDive,
  });

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const handleSave = () => {
    if (!diveId) return;
    saveReport({
      diveId,
      title: title.trim() || "Untitled report",
      description,
      createdAt: Date.now(),
    });
    setSaved(true);
    showToast("Saved to your reports");
  };

  const handleNew = () => {
    chat.reset();
    setDiveId(null);
    setTitle("");
    setDescription(undefined);
    setNonce(0);
    setSaved(false);
    titleTouched.current = false;
  };

  return (
    <div className="build-split">
      {/* Left: chat */}
      <div className="build-chat">
        <div className="build-toolbar">
          <button className="btn btn-ghost" onClick={handleNew} title="Start a new report">
            <PlusCircle size={16} /> New
          </button>
          <div style={{ flex: 1 }} />
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ChatPanel
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            onSend={chat.send}
            placeholder="Describe the report you want…"
            emptyTitle="Build a report in plain English"
            emptyText="Describe the dashboard you want and I'll build it live against your data. Then keep chatting to tweak it."
            suggestions={
              chat.messages.length === 0
                ? [
                    "Show me monthly revenue trends by product category",
                    "Build a dashboard of my top 10 customers with a bar chart",
                    "Create a summary of activity over the last 90 days",
                  ]
                : undefined
            }
          />
        </div>
      </div>

      {/* Right: live preview */}
      <div className="build-preview">
        <div className="build-toolbar">
          <input
            className="build-title-input"
            placeholder="Report title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              titleTouched.current = true;
              setSaved(false);
            }}
            disabled={!diveId}
          />
          <button className={`btn ${saved ? "" : "btn-primary"}`} onClick={handleSave} disabled={!diveId}>
            {saved ? (
              <>
                <Check size={16} /> Saved
              </>
            ) : (
              <>
                <Save size={16} /> Save report
              </>
            )}
          </button>
        </div>
        <div className="build-preview-body">
          {diveId ? (
            <DiveFrame diveId={diveId} refreshKey={`${diveId}:${nonce}`} />
          ) : (
            <div className="frame-state">
              <Sparkles size={26} style={{ opacity: 0.4 }} />
              <div style={{ maxWidth: 300, textAlign: "center", lineHeight: 1.6 }}>
                Your report will appear here as soon as you describe what you want in the chat.
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="toast">
          <Check size={15} /> {toast}
        </div>
      )}
    </div>
  );
}

export default function BuildPage() {
  return (
    <Suspense fallback={<div className="frame-state"><div className="spinner" /></div>}>
      <BuildPageInner />
    </Suspense>
  );
}
