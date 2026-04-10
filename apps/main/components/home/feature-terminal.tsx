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
  cmd: "text-violet-600",
  result: "text-slate-500",
  dim: "text-slate-400",
  ok: "text-emerald-600",
  blank: "",
};

interface FeatureTerminalProps {
  className?: string;
  lines: TerminalLine[];
}

export function FeatureTerminal({ lines, className }: FeatureTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  const started = useRef(false);

  const clearTimers = useCallback(() => {
    for (const id of timerIds.current) {
      clearTimeout(id);
    }
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
      const id = setTimeout(
        () => {
          const el = lineRefs.current[i];
          if (el) {
            el.style.transition = "opacity 280ms ease";
            el.style.opacity = "1";
          }
        },
        200 + i * LINE_DELAY_MS
      );
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
    if (!el) {
      return;
    }

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
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-slate-50 font-mono",
        className
      )}
      ref={containerRef}
    >
      <div className="flex items-center gap-1.5 border-slate-200 border-b bg-slate-100 px-3 py-2.5">
        <span className="size-2 rounded-full bg-slate-300" />
        <span className="size-2 rounded-full bg-slate-300" />
        <span className="size-2 rounded-full bg-slate-300" />
      </div>
      <div
        className="space-y-1 p-4"
        style={{ minHeight: `${bodyMinHeight}px` }}
      >
        {lines.map((line, i) => (
          <div
            className={cn("text-xs leading-relaxed", TYPE_CLASSES[line.type])}
            // biome-ignore lint/suspicious/noArrayIndexKey: order is static
            key={i}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            style={{ opacity: 0 }}
          >
            {line.type === "blank" ? "\u00a0" : line.text}
          </div>
        ))}
      </div>
    </div>
  );
}
