"use client";

import { useState } from "react";

type Tab = "MCP" | "cURL" | "CLI";
const TABS: Tab[] = ["MCP", "cURL", "CLI"];

const SOURCE: Record<Tab, string> = {
  MCP: `{
  "method": "tools/call",
  "params": {
    "name": "toolbase_search",
    "arguments": {
      "intent": "send transactional email",
      "agent_runnable": true
    }
  }
}`,
  cURL: `curl https://toolbase.sh/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "method": "tools/call",
    "params": {
      "name": "toolbase_search",
      "arguments": {
        "intent": "send transactional email",
        "agent_runnable": true
      }
    }
  }'`,
  CLI: `# connect toolbase to your agent
npx toolbase mcp install

# let your agent search the directory
toolbase search "send transactional email" \\
  --agent-runnable \\
  --format json`,
};

export function HeroCodeCard() {
  const [active, setActive] = useState<Tab>("MCP");
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(SOURCE[active]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="relative h-[384px] w-full">
      <div className="absolute inset-x-0 top-0 h-[322px] translate-x-3 translate-y-2 border border-[#262626] bg-[#111]" />
      <div className="absolute inset-x-0 top-0 h-[322px] translate-x-[6px] translate-y-1 border border-[#262626] bg-[#0d0d0d]" />
      <div className="relative h-[322px] w-full overflow-hidden border border-[#262626] bg-[#0a0a0a] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent_0%,#595959_50%,transparent_100%)]" />

        <div
          className="flex h-12 items-center justify-between border-[#262626] border-b px-6"
          role="tablist"
        >
          <div className="flex h-[47px] gap-6">
            {TABS.map((t) => {
              const isActive = t === active;
              return (
                <button
                  aria-selected={isActive}
                  className={
                    isActive
                      ? "relative flex h-[47px] cursor-pointer items-center font-medium font-mono text-[14px] text-white uppercase leading-5 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-white"
                      : "flex h-[47px] cursor-pointer items-center font-medium font-mono text-[#777] text-[14px] uppercase leading-5 transition-colors hover:text-[#a9b1d6]"
                  }
                  key={t}
                  onClick={() => setActive(t)}
                  role="tab"
                  type="button"
                >
                  {t}
                </button>
              );
            })}
          </div>
          <button
            aria-label="Copy snippet"
            className="-mr-2 inline-flex size-7 cursor-pointer items-center justify-center text-[#777] transition-colors hover:text-white"
            onClick={copy}
            type="button"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>

        <div className="h-[272px] overflow-auto p-6">
          {active === "MCP" && <McpSnippet />}
          {active === "cURL" && <CurlSnippet />}
          {active === "CLI" && <CliSnippet />}
        </div>
      </div>
    </div>
  );
}

/* ---------- snippets ---------- */

function Line({ children }: { children: React.ReactNode }) {
  return <span className="block">{children || "\u00a0"}</span>;
}

function Key({ k }: { k: string }) {
  return (
    <>
      <span className="text-[#e0af68]">&quot;{k}&quot;</span>
      <span className="text-[#89ddff]">:</span>{" "}
    </>
  );
}

function Str({ v }: { v: string }) {
  return <span className="text-[#9ece6a]">&quot;{v}&quot;</span>;
}

function Brace({ c }: { c: "{" | "}" }) {
  return <span className="text-[#9abdf5]">{c}</span>;
}

function McpSnippet() {
  return (
    <pre className="m-0 font-mono text-[13.5px] leading-7">
      <code>
        <Line>
          <span className="text-[#595959]">// jsonrpc · tools/call</span>
        </Line>
        <Line>
          <Brace c="{" />
        </Line>
        <Line>
          {"  "}
          <Key k="method" />
          <Str v="tools/call" />,
        </Line>
        <Line>
          {"  "}
          <Key k="params" />
          <Brace c="{" />
        </Line>
        <Line>
          {"    "}
          <Key k="name" />
          <Str v="toolbase_search" />,
        </Line>
        <Line>
          {"    "}
          <Key k="arguments" />
          <Brace c="{" />
        </Line>
        <Line>
          {"      "}
          <Key k="intent" />
          <Str v="send transactional email" />,
        </Line>
        <Line>
          {"      "}
          <Key k="agent_runnable" />
          <span className="text-[#ff9e64]">true</span>
        </Line>
        <Line>
          {"    "}
          <Brace c="}" />
        </Line>
        <Line>
          {"  "}
          <Brace c="}" />
        </Line>
        <Line>
          <Brace c="}" />
        </Line>
      </code>
    </pre>
  );
}

function CurlSnippet() {
  return (
    <pre className="m-0 font-mono text-[13.5px] leading-7">
      <code>
        <Line>
          <span className="text-[#ff9e64]">curl</span>{" "}
          <span className="text-[#9ece6a]">https://toolbase.sh/api/mcp</span>{" "}
          <span className="text-[#89ddff]">\</span>
        </Line>
        <Line>
          {"  "}
          <span className="text-[#e0af68]">-H</span>{" "}
          <Str v="Content-Type: application/json" />{" "}
          <span className="text-[#89ddff]">\</span>
        </Line>
        <Line>
          {"  "}
          <span className="text-[#e0af68]">-d</span>{" "}
          <span className="text-[#9ece6a]">&apos;</span>
          <Brace c="{" />
        </Line>
        <Line>
          {"    "}
          <Key k="method" />
          <Str v="tools/call" />,
        </Line>
        <Line>
          {"    "}
          <Key k="params" />
          <Brace c="{" />
        </Line>
        <Line>
          {"      "}
          <Key k="name" />
          <Str v="toolbase_search" />,
        </Line>
        <Line>
          {"      "}
          <Key k="arguments" />
          <Brace c="{" />
        </Line>
        <Line>
          {"        "}
          <Key k="intent" />
          <Str v="send transactional email" />,
        </Line>
        <Line>
          {"        "}
          <Key k="agent_runnable" />
          <span className="text-[#ff9e64]">true</span>
        </Line>
        <Line>
          {"      "}
          <Brace c="}" />
        </Line>
        <Line>
          {"    "}
          <Brace c="}" />
        </Line>
        <Line>
          {"  "}
          <Brace c="}" />
          <span className="text-[#9ece6a]">&apos;</span>
        </Line>
      </code>
    </pre>
  );
}

function CliSnippet() {
  return (
    <pre className="m-0 font-mono text-[13.5px] leading-7">
      <code>
        <Line>
          <span className="text-[#595959]">
            # connect toolbase to your agent
          </span>
        </Line>
        <Line>
          <span className="text-[#ff9e64]">npx</span>{" "}
          <span className="text-[#a9b1d6]">toolbase</span>{" "}
          <span className="text-[#7aa2f7]">mcp install</span>
        </Line>
        <Line>{""}</Line>
        <Line>
          <span className="text-[#595959]">
            # let your agent search the directory
          </span>
        </Line>
        <Line>
          <span className="text-[#a9b1d6]">toolbase</span>{" "}
          <span className="text-[#7aa2f7]">search</span>{" "}
          <Str v="send transactional email" />{" "}
          <span className="text-[#89ddff]">\</span>
        </Line>
        <Line>
          {"  "}
          <span className="text-[#e0af68]">--agent-runnable</span>{" "}
          <span className="text-[#89ddff]">\</span>
        </Line>
        <Line>
          {"  "}
          <span className="text-[#e0af68]">--format</span>{" "}
          <span className="text-[#ff9e64]">json</span>
        </Line>
      </code>
    </pre>
  );
}

/* ---------- icons ---------- */

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="14"
    >
      <rect height="14" rx="2" ry="2" width="14" x="8" y="8" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="14"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
