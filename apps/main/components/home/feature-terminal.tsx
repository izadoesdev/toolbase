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
  cmd:    "text-lime-400",
  result: "text-zinc-500",
  dim:    "text-zinc-600 dark:text-zinc-700",
  ok:     "text-emerald-400",
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
    for (const id of timerIds.current) clearTimeout(id);
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

  // Pre-allocate height: 32px padding (p-4 top+bottom) + ~24px per line
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
