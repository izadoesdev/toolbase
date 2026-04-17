"use client";

import type { ComponentType } from "react";
import { useState } from "react";

type PlatformId = "cursor" | "claude-code" | "claude-desktop" | "windsurf";

const MCP_URL = "https://toolbase.sh/api/mcp";

const MCP_CONFIG = `{
  "mcpServers": {
    "toolbase": {
      "url": "${MCP_URL}"
    }
  }
}`;

const CLAUDE_CODE_CMD = `claude mcp add --transport http toolbase ${MCP_URL}`;

interface Platform {
  actionLabel: string;
  id: PlatformId;
  mark: ComponentType<{ className?: string }>;
  name: string;
  payload: string;
  run: () => void | Promise<void>;
}

function CursorMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
    </svg>
  );
}

function AnthropicMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
    </svg>
  );
}

function ClaudeCodeMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8.5 9 5 12l3.5 3" />
      <path d="m15.5 9 3.5 3-3.5 3" />
    </svg>
  );
}

function WindsurfMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M23.55 5.067c-1.2038-.002-2.1806.973-2.1806 2.1765v4.8676c0 .972-.8035 1.7594-1.7597 1.7594-.568 0-1.1352-.286-1.4718-.7659l-4.9713-7.1003c-.4125-.5896-1.0837-.941-1.8103-.941-1.1334 0-2.1533.9635-2.1533 2.153v4.8957c0 .972-.7969 1.7594-1.7596 1.7594-.57 0-1.1363-.286-1.4728-.7658L.4076 5.1598C.2822 4.9798 0 5.0688 0 5.2882v4.2452c0 .2147.0656.4228.1884.599l5.4748 7.8183c.3234.462.8006.8052 1.3509.9298 1.3771.313 2.6446-.747 2.6446-2.0977v-4.893c0-.972.7875-1.7593 1.7596-1.7593h.003a1.798 1.798 0 0 1 1.4718.7658l4.9723 7.0994c.4135.5905 1.05.941 1.8093.941 1.1587 0 2.1515-.9645 2.1515-2.153v-4.8948c0-.972.7875-1.7594 1.7596-1.7594h.194a.22.22 0 0 0 .2204-.2202v-4.622a.22.22 0 0 0-.2203-.2203Z" />
    </svg>
  );
}

async function writeClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function McpInstallButtons() {
  const [state, setState] = useState<PlatformId | null>(null);

  const flash = (id: PlatformId) => {
    setState(id);
    setTimeout(() => setState((cur) => (cur === id ? null : cur)), 2000);
  };

  const platforms: Platform[] = [
    {
      id: "cursor",
      name: "Cursor",
      actionLabel: "Add ↗",
      payload: MCP_URL,
      mark: CursorMark,
      run: () => {
        const config = btoa(JSON.stringify({ url: MCP_URL }));
        window.location.href = `cursor://anysphere.cursor-deeplink/mcp/install?name=toolbase&config=${config}`;
        flash("cursor");
      },
    },
    {
      id: "claude-code",
      name: "Claude Code",
      actionLabel: "Copy cmd",
      payload: CLAUDE_CODE_CMD,
      mark: ClaudeCodeMark,
      run: async () => {
        await writeClipboard(CLAUDE_CODE_CMD);
        flash("claude-code");
      },
    },
    {
      id: "claude-desktop",
      name: "Claude Desktop",
      actionLabel: "Copy config",
      payload: MCP_CONFIG,
      mark: AnthropicMark,
      run: async () => {
        await writeClipboard(MCP_CONFIG);
        flash("claude-desktop");
      },
    },
    {
      id: "windsurf",
      name: "Windsurf",
      actionLabel: "Copy config",
      payload: MCP_CONFIG,
      mark: WindsurfMark,
      run: async () => {
        await writeClipboard(MCP_CONFIG);
        flash("windsurf");
      },
    },
  ];

  return (
    <div
      className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4"
      data-mcp-url={MCP_URL}
      role="group"
    >
      {platforms.map((p) => {
        const isCopied = state === p.id;
        const Mark = p.mark;
        return (
          <button
            aria-label={`Install Toolbase for ${p.name}`}
            aria-live="polite"
            className={`group relative flex flex-col items-start gap-3 border px-4 py-4 text-left transition-colors ${
              isCopied
                ? "border-[#9ece6a] bg-[#0f140c]"
                : "border-[#262626] bg-[#0a0a0a] hover:border-[#9ece6a]/40 hover:bg-[#111]"
            }`}
            data-install-target={p.id}
            data-payload={p.payload}
            data-state={isCopied ? "copied" : "idle"}
            key={p.id}
            onClick={() => {
              p.run();
            }}
            type="button"
          >
            <span className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent_0%,#595959_50%,transparent_100%)] opacity-60 transition-opacity group-hover:opacity-100" />
            <Mark
              className={`size-4 shrink-0 transition-colors ${
                isCopied
                  ? "text-[#9ece6a]"
                  : "text-[#d4d4d4] group-hover:text-white"
              }`}
            />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-medium text-[13px] text-white leading-none tracking-tight">
                {p.name}
              </span>
              <span
                className={`font-mono text-[10px] uppercase leading-none tracking-[0.2em] transition-colors ${
                  isCopied
                    ? "text-[#9ece6a]"
                    : "text-[#777] group-hover:text-[#9c9ca6]"
                }`}
              >
                {isCopied ? "✓ Copied" : p.actionLabel}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
