import Link from "next/link";
import { SessionControls } from "@/components/auth/session-controls";
import { BRAND_NAME } from "@/components/brand-logo";

const NAV_LINKS = [
  { href: "/#registry", label: "Browse" },
  { href: "/api/mcp", label: "MCP" },
  { href: "/api", label: "API" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50" style={{ background: "#d4d0c8", borderBottom: "2px solid #808080", boxShadow: "0 2px 0 #404040" }}>
      {/* Classic Windows title bar gradient strip */}
      <div className="win-title-bar" style={{ padding: "2px 8px", fontSize: "11px" }}>
        <span style={{ fontSize: "14px" }}>🧰</span>
        <span style={{ fontWeight: "bold", fontSize: "11px" }}>{BRAND_NAME} — Tool Catalog for AI Agents</span>
        <div className="flex-1" />
        {/* Classic Win2000 window control buttons */}
        <button
          aria-label="Minimize"
          style={{
            width: 16,
            height: 14,
            background: "#d4d0c8",
            borderTop: "1px solid #fff",
            borderLeft: "1px solid #fff",
            borderRight: "1px solid #404040",
            borderBottom: "1px solid #404040",
            fontSize: "9px",
            lineHeight: 1,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: "2px",
          }}
          type="button"
        >
          _
        </button>
        <button
          aria-label="Maximize"
          style={{
            width: 16,
            height: 14,
            background: "#d4d0c8",
            borderTop: "1px solid #fff",
            borderLeft: "1px solid #fff",
            borderRight: "1px solid #404040",
            borderBottom: "1px solid #404040",
            fontSize: "9px",
            lineHeight: 1,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          type="button"
        >
          □
        </button>
        <button
          aria-label="Close"
          style={{
            width: 16,
            height: 14,
            background: "#cc0000",
            borderTop: "1px solid #ff6666",
            borderLeft: "1px solid #ff6666",
            borderRight: "1px solid #880000",
            borderBottom: "1px solid #880000",
            fontSize: "9px",
            lineHeight: 1,
            cursor: "pointer",
            color: "#ffffff",
            fontWeight: "bold",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          type="button"
        >
          ✕
        </button>
      </div>

      {/* Menu bar */}
      <div style={{ background: "#d4d0c8", borderBottom: "1px solid #808080", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 6px" }}>
        <nav className="flex items-center gap-0">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              className="win-menu-item"
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <SessionControls />
      </div>
    </header>
  );
}
