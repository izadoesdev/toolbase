import { cn } from "@/lib/utils";

export const BRAND_NAME = "Toolbase";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md";
}

export function BrandLogo({ className, size = "md" }: BrandLogoProps) {
  const s = size === "sm" ? 20 : 24;
  return (
    <svg
      aria-hidden
      className={cn("shrink-0 text-foreground", className)}
      fill="none"
      height={s}
      viewBox="0 0 24 24"
      width={s}
    >
      <title>Toolbase</title>
      <path
        d="M3 7l9-4 9 4v10l-9 4-9-4V7z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M3 7l9 4 9-4"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M12 11v10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={1.5}
      />
      <circle cx={12} cy={14} fill="currentColor" r={1.5} />
    </svg>
  );
}
