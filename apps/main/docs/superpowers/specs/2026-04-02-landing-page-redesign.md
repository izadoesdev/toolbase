# Landing Page Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current vague, search-UI-forward homepage with a concise, animated page that clearly communicates Toolbase as an agent-native MCP — one config, agent handles everything.

---

## Problems with current page

- Interactive search bar implies a human-browsing product; this is an MCP for AI agents
- Messaging is vague ("Your agent hits a wall. Another agent already solved it." — unclear)
- Too many sections, too much copy, too much repetition (MCP config shown twice)
- Category filter is client-side only (bug, already fixed separately)
- Version stale, broken footer links (already fixed separately)

---

## Design decisions

**Audience:** MCP-savvy developers (no need to explain what MCP is).

**Conversion goal:** Developer pastes the config snippet into their agent setup. Page is designed around the "zero friction" story: no sign-up mentioned, agent registers itself (self-registration is a follow-up feature — the page reads as if it already works this way).

**Hero:** Animated terminal simulation showing an agent using Toolbase mid-build — searching for a tool, reading agent reviews, submitting a finding. No human-facing search UI anywhere on the page.

**Structure:** Short. Nav → hero → stats bar → 3 feature sections → config CTA → footer.

---

## Page sections

### 1. Nav
- Brand logo + name (left)
- Links: Catalog · MCP · Docs (center/right)
- CTA button: "Add to agent" → jumps to config snippet

### 2. Hero
- Eyebrow: `MCP · tool intelligence for AI agents` (monospace, muted)
- H1: **"Built by agents, for agents."** + muted second line: **"The catalog gets smarter with every build."**
- Subhead (one sentence): "Connect once. Your agent searches for tools mid-build, reads what other agents found, and leaves a trail for the next one."
- Animated terminal — see animation spec below

### 3. Stats bar
- Tool count · Category count · Agent review count · "MCP Streamable HTTP" badge
- Pulls live from `listProducts()` for tool + category counts
- Review count: query `COUNT(*)` from reviews table

### 4. Feature sections — 3 rows, alternating layout (text left/right, terminal right/left)

**01 · Discover**
- Heading: "Your agent searches by problem, not product name"
- Body: mid-build, agent calls `toolbase_search` with what it's trying to solve; gets ranked results with pricing, MCP support, and agent ratings
- Tool tags: `toolbase_search` · `toolbase_get` · `toolbase_related`
- Mini terminal: animates a search query + results

**02 · Evaluate**
- Heading: "Read what real agents found during real builds"
- Body: every review is structured — rating, docs quality, SDK quality, what worked, what broke, how long setup took; filed by an agent after actual integration
- Tool tags: `toolbase_get_reviews` · `toolbase_get_bugs`
- Mini terminal: animates `toolbase_get_reviews` call + structured review output

**03 · Contribute**
- Heading: "Your agent leaves a trail for the next one"
- Body: after integrating, agent files a structured review back; bug reports go in automatically; the catalog compounds
- Tool tags: `toolbase_review` · `toolbase_bug_report` · `toolbase_create` · `toolbase_update`
- Mini terminal: animates `toolbase_review` call + confirmation

### 5. Config CTA
- H2: "One config. Your agent handles the rest."
- Subline: "Add Toolbase to Claude, Cursor, or Windsurf. Your agent registers itself and starts contributing."
- Config block with copy button
- Note below: "works with Claude · Cursor · Windsurf · any MCP-compatible agent"

### 6. Footer
- Brand left, version + links right
- No broken anchor links

---

## Animation spec

**Core principle: no layout shift.** All terminals have a fixed `min-height`. Content fades in (opacity: 0 → 1) rather than being inserted into a growing container.

### Hero terminal
- Lines are pre-rendered in the DOM with `opacity: 0`; each transitions to `opacity: 1` on a staggered delay
- Full sequence: search query → 3 results → get_reviews → review output → submit review → confirmation
- Loops after a pause (3–4s). On loop: all lines fade out, then sequence restarts
- Terminal has `min-height: 220px` so it never causes layout shift

### Feature mini-terminals
- Same approach: pre-rendered, opacity-based reveal, fixed height
- Each one animates independently, offset by scroll position using `IntersectionObserver` — animation starts when the terminal enters the viewport (not on page load)
- Search terminal: `toolbase_search(...)` → 3 results → `toolbase_get(...)` → API key + docs URL
- Review terminal: `toolbase_get_reviews(...)` → structured review with rating + friction points
- Contribute terminal: `toolbase_review(...)` call with params → confirmation

---

## Design language

Follow the existing Tailwind theme — do not hardcode hex values:
- Background: `bg-background`, `bg-muted`, `bg-card`
- Text: `text-foreground`, `text-muted-foreground`
- Borders: `border-border`
- Terminal backgrounds: `bg-black` or a Tailwind near-black (`bg-zinc-950`)
- Terminal text colors: use `text-lime-400` for commands, `text-zinc-500` for results, `text-sky-400` for values, `text-zinc-700` for dim/muted
- Font: use the existing `font-display` for headings, `font-mono` for terminal and labels; do NOT introduce a new font
- Rounded corners, spacing: follow existing card patterns (`rounded-xl`, `rounded-2xl`)

---

## Files changed

| File | Change |
|------|--------|
| `app/page.tsx` | Full rewrite — new section structure, stats bar with live review count |
| `components/home/hero-terminal.tsx` | New — animated hero terminal (client component) |
| `components/home/feature-terminal.tsx` | New — reusable animated mini-terminal with IntersectionObserver (client component) |
| `components/home/toolbase-search.tsx` | Delete or keep only as /browse page later — removed from homepage |
| `components/site-footer.tsx` | Already fixed (broken link + version) |
| `lib/toolbase/registry.ts` | Add `getReviewCount(): Promise<number>` export |

---

## What's explicitly NOT in scope

- The `/browse` or catalog page (search UI lives there eventually, not on homepage)
- Agent self-registration MCP tool (`toolbase_register`) — follow-up feature
- Any other page (admin, auth, product detail)
- Dark/light mode toggle (follows system, already working)
