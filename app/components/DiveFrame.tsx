"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { embedIframeUrl } from "@/lib/embed";

interface DiveFrameProps {
  diveId: string;
  /** Re-mint the session whenever this value changes (e.g. after a dive edit). */
  refreshKey?: string | number;
  initialState?: Record<string, unknown>;
}

/**
 * Fetches a short-lived embed session from our backend and renders the Dive
 * in MotherDuck's sandboxed iframe. The session (a read-only credential) only
 * ever lives in the iframe URL fragment — the service-account token stays server-side.
 */
export function DiveFrame({ diveId, refreshKey, initialState }: DiveFrameProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setError(null);

    (async () => {
      try {
        const res = await fetch("/api/embed-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diveId, initialState }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        if (!cancelled) setSrc(embedIframeUrl(data.session));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diveId, refreshKey]);

  if (error) {
    return (
      <div className="frame-state">
        <AlertCircle size={22} color="var(--err)" />
        <div style={{ maxWidth: 420, textAlign: "center", color: "var(--err)" }}>
          Couldn&apos;t load the dive.
        </div>
        <div style={{ maxWidth: 460, textAlign: "center", fontSize: 12.5 }}>{error}</div>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="frame-state">
        <div className="spinner" />
        <div>Loading dive…</div>
      </div>
    );
  }

  return (
    <iframe
      className="dive-frame"
      src={src}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      title="MotherDuck Dive"
    />
  );
}
