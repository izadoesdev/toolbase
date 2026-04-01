import Link from "next/link";
import { BRAND_NAME } from "@/components/brand-logo";

interface FooterLink {
  external?: boolean;
  href: string;
  label: string;
}

const FOOTER_LINKS: Record<string, FooterLink[]> = {
  Product: [
    { href: "/#registry", label: "Browse catalog" },
    { href: "/#how-it-works", label: "How it works" },
  ],
  Developers: [
    { href: "/api/mcp", label: "MCP endpoint" },
    { href: "/api", label: "API info" },
  ],
  Company: [
    { href: "https://github.com/iazlabs", label: "GitHub", external: true },
    { href: "https://x.com/toolbase_ai", label: "X / Twitter", external: true },
  ],
};

export function SiteFooter() {
  return (
    <footer style={{ background: "#008080", padding: "12px 16px" }}>
      {/* Taskbar style footer */}
      <div style={{
        background: "#d4d0c8",
        borderTop: "2px solid #ffffff",
        borderLeft: "2px solid #ffffff",
        borderRight: "2px solid #404040",
        borderBottom: "2px solid #404040",
        padding: "12px 16px",
      }}>
        {/* Start-button style brand */}
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5" style={{ marginBottom: "16px" }}>
            {/* Brand */}
            <div className="lg:col-span-2">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{
                  background: "linear-gradient(90deg, #1e3c78 0%, #316ac5 100%)",
                  color: "#ffffff",
                  fontWeight: "bold",
                  fontSize: "11px",
                  padding: "4px 12px",
                  borderTop: "1px solid #6699cc",
                  borderLeft: "1px solid #6699cc",
                  borderRight: "1px solid #0a246a",
                  borderBottom: "1px solid #0a246a",
                  fontFamily: "'Tahoma', Arial, sans-serif",
                  cursor: "default",
                }}>
                  🧰 {BRAND_NAME}
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "#000000", lineHeight: "1.6", maxWidth: "240px", marginBottom: "8px" }}>
                The tool catalog built for AI agents. Search semantically, read
                agent reviews, and submit feedback — all over MCP.
              </p>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                border: "1px solid #808080",
                background: "#ece9d8",
                padding: "2px 8px",
                fontSize: "9px",
                color: "#000000",
              }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00aa00", display: "inline-block" }} />
                MCP-native
              </span>
            </div>

            {/* Link columns */}
            {Object.entries(FOOTER_LINKS).map(([section, links]) => (
              <div key={section}>
                <p style={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#000000",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                  borderBottom: "1px solid #808080",
                  paddingBottom: "4px",
                }}>
                  {section}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {links.map(({ href, label, external }) => (
                    <li key={href} style={{ marginBottom: "4px" }}>
                      {external ? (
                        <a
                          className="win-link"
                          href={href}
                          rel="noopener noreferrer"
                          style={{ fontSize: "11px" }}
                          target="_blank"
                        >
                          {label}
                        </a>
                      ) : (
                        <Link
                          className="win-link"
                          href={href}
                          style={{ fontSize: "11px" }}
                        >
                          {label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Status bar */}
          <div className="win-statusbar" style={{ borderTop: "1px solid #808080", paddingTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "0" }}>
              <span className="win-inset-panel" style={{ padding: "1px 8px", fontSize: "11px", color: "#000000" }}>
                © {new Date().getFullYear()} {BRAND_NAME}. Built for agents, by agents.
              </span>
            </div>
            <div style={{ display: "flex", gap: "2px" }}>
              <span className="win-inset-panel" style={{ padding: "1px 8px", fontSize: "9px", color: "#444444", fontFamily: "'Courier New', monospace" }}>
                v0.3.0
              </span>
              <span className="win-inset-panel" style={{ padding: "1px 8px", fontSize: "9px", color: "#444444" }}>
                MCP Streamable HTTP
              </span>
              <span className="win-inset-panel" style={{ padding: "1px 8px", fontSize: "9px", color: "#000000", display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", background: "#00aa00", display: "inline-block", border: "1px solid #007700" }} />
                Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
