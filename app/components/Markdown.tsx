"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Open any links in a new tab.
        a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
