"use client";

import { useCallback, useRef, useState } from "react";

export interface Activity {
  tool: string;
  summary: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  activities: Activity[];
}

export interface DiveEvent {
  diveId: string;
  title?: string;
  description?: string;
}

interface UseChatOptions {
  endpoint: string;
  /** Extra fields merged into every request body (e.g. currentDiveId, context). */
  body?: () => Record<string, unknown>;
  /** Fired when the backend reports a dive was created/updated. */
  onDive?: (dive: DiveEvent) => void;
}

export function useChat({ endpoint, body, onDive }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setMessages([]);
  }, [stop]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const history = [...messages, { role: "user" as const, content: trimmed, activities: [] }];
      // Add the user message + an empty assistant placeholder.
      setMessages([...history, { role: "assistant", content: "", activities: [] }]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      // Patch the streaming assistant message (always the last one).
      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = fn(next[next.length - 1]);
          return next;
        });

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            ...(body ? body() : {}),
          }),
        });

        if (!res.body) throw new Error("No response stream");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (!json) continue;
            let evt: Record<string, unknown>;
            try {
              evt = JSON.parse(json);
            } catch {
              continue;
            }
            if (evt.type === "text") {
              patch((m) => ({ ...m, content: m.content + (evt.content as string) }));
            } else if (evt.type === "tool") {
              patch((m) => ({
                ...m,
                activities: [...m.activities, { tool: evt.tool as string, summary: evt.summary as string }],
              }));
            } else if (evt.type === "dive") {
              onDive?.({
                diveId: evt.diveId as string,
                title: evt.title as string | undefined,
                description: evt.description as string | undefined,
              });
            } else if (evt.type === "error") {
              patch((m) => ({ ...m, content: m.content + `\n\n⚠️ ${evt.message}` }));
            }
          }
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          patch((m) => ({
            ...m,
            content: m.content + `\n\n⚠️ ${e instanceof Error ? e.message : String(e)}`,
          }));
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [endpoint, body, onDive, messages, isStreaming],
  );

  return { messages, send, isStreaming, stop, reset };
}
