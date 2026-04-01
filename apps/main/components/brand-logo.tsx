import { McpServerIcon, ToolboxIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "Toolbase";

interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md";
}

export function BrandLogo({
  className,
  iconClassName,
  size = "md",
}: BrandLogoProps) {
  const box = size === "sm" ? "size-8" : "size-10";
  const main = size === "sm" ? "size-[18px]" : "size-[22px]";
  const badge = size === "sm" ? "size-3.5" : "size-4";

  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-muted",
        box,
        className
      )}
    >
      <HugeiconsIcon
        className={cn("text-foreground", main, iconClassName)}
        icon={ToolboxIcon}
        strokeWidth={2}
      />
      <span
        className={cn(
          "absolute -right-0.5 -bottom-0.5 inline-flex items-center justify-center rounded-md border border-border bg-background",
          badge
        )}
      >
        <HugeiconsIcon
          className="size-[65%] text-primary"
          icon={McpServerIcon}
          strokeWidth={2}
        />
      </span>
    </span>
  );
}
