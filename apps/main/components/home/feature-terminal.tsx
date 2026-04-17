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
  cmd: "text-[#7aa2f7]",
  result: "text-[#a9b1d6]",
  dim: "text-[#595959]",
  ok: "text-[#9ece6a]",
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
        "relative overflow-hidden border border-[#262626] bg-[#0a0a0a] font-mono shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]",
        className
      )}
      ref={containerRef}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent_0%,#595959_50%,transparent_100%)]" />
      <div className="flex items-center gap-1.5 border-[#262626] border-b bg-[#0d0d0d] px-4 py-2.5">
        <span className="size-2 rounded-full bg-[#262626]" />
        <span className="size-2 rounded-full bg-[#262626]" />
        <span className="size-2 rounded-full bg-[#262626]" />
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
