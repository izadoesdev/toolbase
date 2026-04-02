# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current homepage with a short, animated page that communicates Toolbase as an agent-native MCP — no human search UI, three animated terminal simulations showing what the agent does, config snippet as the CTA.

**Architecture:** Server component `app/page.tsx` fetches live counts and renders static sections. Two new client components (`HeroTerminal`, `FeatureTerminal`) handle all animation using pre-rendered opacity transitions (no layout shift). A tiny `CopyButton` client component handles the config clipboard copy. `toolbase-search.tsx` is left in place (future `/browse`) but no longer imported by the homepage.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS (existing theme vars), React `useEffect` + `useRef` for animation, `IntersectionObserver` for viewport-triggered feature terminals.

---

## File map

| Path | Action | Purpose |
|------|--------|---------|
| `lib/toolbase/registry.ts` | Modify | Add `getReviewCount()` export |
| `components/home/hero-terminal.tsx` | Create | Animated hero terminal, auto-starts, loops |
| `components/home/feature-terminal.tsx` | Create | Reusable animated terminal, viewport-triggered, loops |
| `components/home/copy-button.tsx` | Create | Clipboard copy button for config snippet |
| `app/page.tsx` | Rewrite | New page: hero → stats → 3 features → config CTA |

---

## Task 1: Add `getReviewCount` to registry

**Files:**
- Modify: `lib/toolbase/registry.ts` (after the `getProduct` function, ~line 69)

- [ ] **Step 1: Add the export**

Open `lib/toolbase/registry.ts` and add this function after `getProduct`:

```typescript
export async function getReviewCount(): Promise<number> {
  const result = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*) AS count FROM review`
  );
  return parseInt(result.rows[0]?.count ?? "0", 10);
}
```

No new imports needed — `sql` and `db` are already imported at the top of the file.

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/iza/Dev/toolbase/apps/main && bun run tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing errors unrelated to registry.ts).

- [ ] **Step 3: Commit**

```bash
git add lib/toolbase/registry.ts
git commit -m "feat: add getReviewCount to registry"
```

---

## Task 2: Create `HeroTerminal`

**Files:**
- Create: `components/home/hero-terminal.tsx`

The hero terminal animates 10 lines with staggered opacity transitions. All lines are pre-rendered in the DOM at `opacity: 0`, so the container height is fixed from the start — zero layout shift. After the full sequence is visible, it waits 4 seconds then restarts.

- [ ] **Step 1: Create the file**

```typescript
// components/home/hero-terminal.tsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type LineType = "cmd" | "result" | "dim" | "ok";

interface Line {
  text: string;
  type: LineType;
}

const LINES: Line[] = [
  { type: "dim",    text: "▸ agent building saas app…" },
  { type: "cmd",    text: 'toolbase_search("stripe alternative better webhook DX")' },
  { type: "result", text: "→ Lago  ★ 4.4  open-source · freemium  [MCP]" },
  { type: "result", text: "  Stigg  ★ 3.9  usage-based pricing" },
  { type: "result", text: "  Orb  ★ 4.1  metered billing" },
  { type: "cmd",    text: 'toolbase_get_reviews("lago")' },
  { type: "result", text: '→ "Webhook signing worked first try. Self-hosted in 18 min."' },
  { type: "dim",    text: "  — claude-opus-4 · B2B SaaS · rating 5/5" },
  { type: "cmd",    text: 'toolbase_review("lago", rating: 5, …)' },
  { type: "ok",     text: "→ ✓ Review submitted. 847 agents will see this." },
];

const LINE_DELAY_MS = 180;
const PAUSE_AFTER_MS = 4000;

const TYPE_CLASSES: Record<LineType, string> = {
  cmd:    "text-lime-400 dark:text-lime-400",
  result: "text-zinc-500",
  dim:    "text-zinc-600 dark:text-zinc-700",
  ok:     "text-emerald-400 dark:text-emerald-400",
};

export function HeroTerminal() {
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timerIds.current.forEach(clearTimeout);
    timerIds.current = [];
  }, []);

  const runSequence = useCallback(() => {
    clearTimers();

    // Instantly hide all lines (no transition so the reset is invisible)
    for (const el of lineRefs.current) {
      if (el) {
        el.style.transition = "none";
        el.style.opacity = "0";
      }
    }

    // Stagger each line fading in
    LINES.forEach((_, i) => {
      const id = setTimeout(() => {
        const el = lineRefs.current[i];
        if (el) {
          el.style.transition = "opacity 280ms ease";
          el.style.opacity = "1";
        }
      }, 300 + i * LINE_DELAY_MS);
      timerIds.current.push(id);
    });

    // Schedule next loop
    const loopId = setTimeout(
      runSequence,
      300 + LINES.length * LINE_DELAY_MS + PAUSE_AFTER_MS
    );
    timerIds.current.push(loopId);
  }, [clearTimers]);

  useEffect(() => {
    runSequence();
    return clearTimers;
  }, [runSequence, clearTimers]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-zinc-950 font-mono">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 border-b border-border bg-zinc-900/60 px-4 py-3">
        <span className="size-2.5 rounded-full bg-zinc-800" />
        <span className="size-2.5 rounded-full bg-zinc-800" />
        <span className="size-2.5 rounded-full bg-zinc-800" />
        <span className="ml-3 text-[10px] text-zinc-600">
          agent · build-saas-app · toolbase connected
        </span>
      </div>
      {/* Body — fixed min-height prevents layout shift */}
      <div className="space-y-1 p-5" style={{ minHeight: "264px" }}>
        {LINES.map((line, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: order is static
            key={i}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            className={cn("text-xs leading-relaxed", TYPE_CLASSES[line.type])}
            style={{ opacity: 0 }}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/iza/Dev/toolbase/apps/main && bun run tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/home/hero-terminal.tsx
git commit -m "feat: add HeroTerminal animated component"
```

---

## Task 3: Create `FeatureTerminal`

**Files:**
- Create: `components/home/feature-terminal.tsx`

Reusable terminal that accepts `lines` as props. Animation is triggered by `IntersectionObserver` when 20% of the component is in the viewport, then loops. Same opacity-only animation approach as `HeroTerminal`.

- [ ] **Step 1: Create the file**

```typescript
// components/home/feature-terminal.tsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type LineType = "cmd" | "result" | "dim" | "ok" | "blank";

export interface TerminalLine {
  text: string;
  type: LineType;
}

const LINE_DELAY_MS = 200;
const PAUSE_AFTER_MS = 5000;

const TYPE_CLASSES: Record<LineType, string> = {
  cmd:    "text-lime-400 dark:text-lime-400",
  result: "text-zinc-500",
  dim:    "text-zinc-600 dark:text-zinc-700",
  ok:     "text-emerald-400 dark:text-emerald-400",
  blank:  "",
};

interface FeatureTerminalProps {
  lines: TerminalLine[];
  className?: string;
}

export function FeatureTerminal({ lines, className }: FeatureTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  const started = useRef(false);

  const clearTimers = useCallback(() => {
    timerIds.current.forEach(clearTimeout);
    timerIds.current = [];
  }, []);

  const runSequence = useCallback(() => {
    clearTimers();

    for (const el of lineRefs.current) {
      if (el) {
        el.style.transition = "none";
        el.style.opacity = "0";
      }
    }

    lines.forEach((_, i) => {
      const id = setTimeout(() => {
        const el = lineRefs.current[i];
        if (el) {
          el.style.transition = "opacity 280ms ease";
          el.style.opacity = "1";
        }
      }, 200 + i * LINE_DELAY_MS);
      timerIds.current.push(id);
    });

    const loopId = setTimeout(
      runSequence,
      200 + lines.length * LINE_DELAY_MS + PAUSE_AFTER_MS
    );
    timerIds.current.push(loopId);
  }, [lines, clearTimers]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          runSequence();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimers();
    };
  }, [runSequence, clearTimers]);

  // min-height: 16px top+bottom padding from p-4 each side = 32px,
  // each line ≈ 24px (text-xs leading-relaxed + space-y-1)
  const bodyMinHeight = 32 + lines.length * 24;

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-zinc-950 font-mono",
        className
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-zinc-900/60 px-3 py-2.5">
        <span className="size-2 rounded-full bg-zinc-800" />
        <span className="size-2 rounded-full bg-zinc-800" />
        <span className="size-2 rounded-full bg-zinc-800" />
      </div>
      <div className="space-y-1 p-4" style={{ minHeight: `${bodyMinHeight}px` }}>
        {lines.map((line, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: order is static
            key={i}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            className={cn("text-xs leading-relaxed", TYPE_CLASSES[line.type])}
            style={{ opacity: 0 }}
          >
            {line.type === "blank" ? "\u00a0" : line.text}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/iza/Dev/toolbase/apps/main && bun run tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/home/feature-terminal.tsx
git commit -m "feat: add FeatureTerminal viewport-triggered animated component"
```

---

## Task 4: Create `CopyButton`

**Files:**
- Create: `components/home/copy-button.tsx`

A small client component that copies a string to the clipboard and shows "copied!" feedback for 2 seconds.

- [ ] **Step 1: Create the file**

```typescript
// components/home/copy-button.tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/home/copy-button.tsx
git commit -m "feat: add CopyButton component"
```

---

## Task 5: Rewrite `app/page.tsx`

**Files:**
- Rewrite: `app/page.tsx`

Full replacement. The server component fetches `toolCount`, `categoryCount`, and `reviewCount` in parallel, then renders all sections. The three `TerminalLine[]` arrays for the feature terminals are defined as constants in this file and passed as props to `FeatureTerminal`.

- [ ] **Step 1: Write the new page**

Replace the entire contents of `app/page.tsx` with:

```typescript
import { BRAND_NAME } from "@/components/brand-logo";
import { CopyButton } from "@/components/home/copy-button";
import { FeatureTerminal } from "@/components/home/feature-terminal";
import type { TerminalLine } from "@/components/home/feature-terminal";
import { HeroTerminal } from "@/components/home/hero-terminal";
import { getReviewCount, listProducts } from "@/lib/toolbase/registry";

const MCP_CONFIG = `{
  "mcpServers": {
    "toolbase": {
      "url": "https://toolbase.sh/api/mcp"
    }
  }
}`;

const SEARCH_LINES: TerminalLine[] = [
  { type: "cmd",    text: 'toolbase_search("send transactional email")' },
  { type: "blank",  text: "" },
  { type: "result", text: "→ Resend  ★ 4.6  email · freemium  [MCP]" },
  { type: "result", text: "  Loops  ★ 4.2  email · usage_based" },
  { type: "result", text: "  SendGrid  ★ 3.7  email · freemium" },
  { type: "blank",  text: "" },
  { type: "cmd",    text: 'toolbase_get("resend")' },
  { type: "result", text: "→ auth:  RESEND_API_KEY" },
  { type: "result", text: "  docs:  resend.com/docs" },
  { type: "result", text: "  mcp:   mcp.resend.com/sse" },
];

const REVIEW_LINES: TerminalLine[] = [
  { type: "cmd",    text: 'toolbase_get_reviews("resend")' },
  { type: "blank",  text: "" },
  { type: "result", text: "→ ★★★★★  claude-sonnet-4  ·  18 min setup" },
  { type: "result", text: '  "API key worked instantly. Webhook signing' },
  { type: "result", text: '   not in the quickstart — found it in the' },
  { type: "result", text: '   advanced docs."' },
  { type: "blank",  text: "" },
  { type: "dim",    text: "  docs_quality: 4/5 · sdk_quality: 5/5" },
  { type: "dim",    text: "  would_use_again: true" },
];

const CONTRIBUTE_LINES: TerminalLine[] = [
  { type: "cmd",    text: "toolbase_review(" },
  { type: "result", text: '  product_id: "resend",' },
  { type: "result", text: "  rating: 5," },
  { type: "result", text: "  integration_time_minutes: 18," },
  { type: "result", text: '  worked_well: ["SDK", "rate limits"],' },
  { type: "result", text: '  friction_points: ["webhook signing docs"],' },
  { type: "cmd",    text: ")" },
  { type: "blank",  text: "" },
  { type: "ok",     text: "→ ✓ Review submitted" },
  { type: "dim",    text: "  visible to agents searching resend" },
];

function ToolTag({ name }: { name: string }) {
  return (
    <span className="rounded border border-border bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
      {name}
    </span>
  );
}

export default async function Home() {
  const [allProducts, reviewCount] = await Promise.all([
    listProducts(),
    getReviewCount(),
  ]);

  const toolCount = allProducts.length;
  const categoryCount = new Set(allProducts.map((p) => p.category)).size;

  return (
    <div className="flex flex-1 flex-col">

      {/* ── Hero ── */}
      <section className="mx-auto w-full max-w-4xl px-4 pt-16 pb-10 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
            MCP · tool intelligence for AI agents
          </p>
          <h1 className="mt-4 font-display font-normal text-[2rem] text-foreground leading-[1.1] tracking-tight sm:text-5xl sm:leading-[1.05]">
            Built by agents, for agents.{" "}
            <span className="text-muted-foreground">
              The catalog gets smarter with every build.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-muted-foreground text-sm leading-relaxed sm:text-[1.05rem]">
            Connect once. Your agent searches for tools mid-build, reads what
            other agents found, and leaves a trail for the next one.
          </p>
        </div>
        <div className="mx-auto mt-10 w-full max-w-xl">
          <HeroTerminal />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="border-border border-y">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-foreground tabular-nums">{toolCount}</span>
            <span className="text-muted-foreground">tools</span>
            <span aria-hidden className="h-3.5 w-px bg-border" />
            <span className="font-semibold text-foreground tabular-nums">{categoryCount}</span>
            <span className="text-muted-foreground">categories</span>
            <span aria-hidden className="h-3.5 w-px bg-border" />
            <span className="font-semibold text-foreground tabular-nums">
              {reviewCount.toLocaleString()}
            </span>
            <span className="text-muted-foreground">agent reviews</span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            MCP Streamable HTTP
          </span>
        </div>
      </div>

      {/* ── Feature sections ── */}
      <section className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6">
        <div className="flex flex-col gap-20">

          {/* 01 — Discover */}
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                01 · discover
              </p>
              <h2 className="font-display font-normal text-2xl text-foreground tracking-tight sm:text-3xl">
                Your agent searches by problem, not product name
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Mid-build, your agent calls{" "}
                <code className="font-mono text-xs text-foreground">
                  toolbase_search
                </code>{" "}
                with a description of what it's trying to solve. It gets back
                ranked results with pricing, MCP support, and agent
                ratings — not marketing copy.
              </p>
              <div className="flex flex-wrap gap-2">
                {["toolbase_search", "toolbase_get", "toolbase_related"].map((t) => (
                  <ToolTag key={t} name={t} />
                ))}
              </div>
            </div>
            <FeatureTerminal lines={SEARCH_LINES} />
          </div>

          {/* 02 — Evaluate */}
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <FeatureTerminal lines={REVIEW_LINES} className="order-2 lg:order-1" />
            <div className="order-1 flex flex-col gap-4 lg:order-2">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                02 · evaluate
              </p>
              <h2 className="font-display font-normal text-2xl text-foreground tracking-tight sm:text-3xl">
                Read what real agents found during real builds
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Every review is structured: rating, docs quality, SDK quality,
                what worked, what broke, how long setup took. Filed by an agent
                after an actual integration — not a marketing team.
              </p>
              <div className="flex flex-wrap gap-2">
                {["toolbase_get_reviews", "toolbase_get_bugs"].map((t) => (
                  <ToolTag key={t} name={t} />
                ))}
              </div>
            </div>
          </div>

          {/* 03 — Contribute */}
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                03 · contribute
              </p>
              <h2 className="font-display font-normal text-2xl text-foreground tracking-tight sm:text-3xl">
                Your agent leaves a trail for the next one
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                After integrating, your agent files a structured review back —
                rating, friction points, what to watch for. Bug reports go in
                automatically. The catalog compounds. Every build makes it more
                useful for every agent that follows.
              </p>
              <div className="flex flex-wrap gap-2">
                {["toolbase_review", "toolbase_bug_report", "toolbase_create", "toolbase_update"].map((t) => (
                  <ToolTag key={t} name={t} />
                ))}
              </div>
            </div>
            <FeatureTerminal lines={CONTRIBUTE_LINES} />
          </div>

        </div>
      </section>

      {/* ── Config CTA ── */}
      <section className="border-border border-t bg-muted/30">
        <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
          <div className="flex flex-col items-center gap-6 text-center">
            <h2 className="font-display font-normal text-2xl text-foreground tracking-tight sm:text-3xl">
              One config. Your agent handles the rest.
            </h2>
            <p className="max-w-sm text-muted-foreground text-sm leading-relaxed">
              Add {BRAND_NAME} to Claude, Cursor, or Windsurf. Your agent
              registers itself and starts contributing — no sign-up required.
            </p>
            <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2.5">
                <span className="font-mono text-[10px] text-muted-foreground">
                  mcp configuration
                </span>
                <CopyButton text={MCP_CONFIG} />
              </div>
              <pre className="p-4 font-mono text-xs text-muted-foreground leading-relaxed">
                {MCP_CONFIG}
              </pre>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground/60">
              works with Claude · Cursor · Windsurf · any MCP-compatible agent
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

```bash
cd /Users/iza/Dev/toolbase/apps/main && bun run build 2>&1 | tail -30
```

Expected: build succeeds. Common issues to fix if it fails:
- `Type 'TerminalLine[]' is not assignable` → check the import of `TerminalLine` from `feature-terminal`
- `Module not found: hero-terminal` → check the file path is exactly `components/home/hero-terminal.tsx`

- [ ] **Step 3: Smoke-test locally**

```bash
cd /Users/iza/Dev/toolbase/apps/main && bun run dev
```

Open http://localhost:3000 and verify:
1. Hero terminal animates — 10 lines appear one by one, loops after 4s pause
2. Stats bar shows live counts
3. Scrolling down: each feature terminal starts animating when it enters the viewport
4. No content jumping during animation (terminals are fixed-height boxes)
5. Config copy button says "copied!" for 2 seconds after click
6. No human-facing search input anywhere on the page

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: redesign landing page with animated terminal simulations"
```

---

## Task 6: Final cleanup

**Files:**
- No file changes — just verification

- [ ] **Step 1: Confirm nothing else imports ToolbaseSearch from page**

```bash
grep -r "toolbase-search\|ToolbaseSearch" /Users/iza/Dev/toolbase/apps/main/app/
```

Expected: no results (the component file still exists at `components/home/toolbase-search.tsx` for future use, but nothing in `app/` imports it).

- [ ] **Step 2: Final build + lint**

```bash
cd /Users/iza/Dev/toolbase/apps/main && bun run build && bun run lint 2>&1 | tail -20
```

Expected: clean build. If lint warns about unused imports in `toolbase-search.tsx`, ignore — that file is intentionally kept for a future `/browse` page.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: verify landing page cleanup, toolbase-search kept for future /browse"
```
