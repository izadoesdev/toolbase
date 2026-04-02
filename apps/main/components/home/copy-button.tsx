"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      className="rounded border border-border bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted/70"
      onClick={handleCopy}
      type="button"
    >
      {copied ? "copied!" : "copy"}
    </button>
  );
}
