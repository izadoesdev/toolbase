"use client";

import Image from "next/image";
import { useState } from "react";

type PlatformId = "cursor" | "claude-code" | "claude-desktop" | "windsurf";

const MCP_CONFIG = `{
  "mcpServers": {
    "toolbase": {
      "url": "https://toolbase.sh/api/mcp"
    }
  }
}`;

const CLAUDE_CODE_CMD =
  "claude mcp add --transport http toolbase https://toolbase.sh/api/mcp";

export function McpInstallButtons() {
  const [copied, setCopied] = useState<PlatformId | null>(null);

  const copy = (id: PlatformId, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const platforms: {
    id: PlatformId;
    name: string;
    logo: string;
    label: string;
    onClick: () => void;
  }[] = [
    {
      id: "cursor",
      name: "Cursor",
      logo: "/logos/cursor.svg",
      label: "Add to Cursor",
      onClick: () => {
        const config = btoa(
          JSON.stringify({ url: "https://toolbase.sh/api/mcp" })
        );
        window.location.href = `cursor://anysphere.cursor-deeplink/mcp/install?name=toolbase&config=${config}`;
      },
    },
    {
      id: "claude-code",
      name: "Claude Code",
      logo: "/logos/anthropic.svg",
      label: copied === "claude-code" ? "copied!" : "Copy command",
      onClick: () => copy("claude-code", CLAUDE_CODE_CMD),
    },
    {
      id: "claude-desktop",
      name: "Claude Desktop",
      logo: "/logos/anthropic.svg",
      label: copied === "claude-desktop" ? "copied!" : "Copy config",
      onClick: () => copy("claude-desktop", MCP_CONFIG),
    },
    {
      id: "windsurf",
      name: "Windsurf",
      logo: "/logos/windsurf.svg",
      label: copied === "windsurf" ? "copied!" : "Copy config",
      onClick: () => copy("windsurf", MCP_CONFIG),
    },
  ];

  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
      {platforms.map((p) => (
        <button
          className="flex cursor-pointer flex-col items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-4 transition-colors hover:bg-muted/50 active:bg-muted"
          key={p.id}
          onClick={p.onClick}
          type="button"
        >
          <Image
            alt={p.name}
            className="size-5"
            height={20}
            src={p.logo}
            width={20}
          />
          <span className="font-medium text-foreground text-xs leading-none">
            {p.name}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground leading-none">
            {p.label}
          </span>
        </button>
      ))}
    </div>
  );
}
