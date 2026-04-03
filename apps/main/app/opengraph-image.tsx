import { ImageResponse } from "takumi-js/response";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TERMINAL_LINES = [
  { color: "#7c3aed", text: 'toolbase_search("send email")' },
  { color: "#64748b", text: "→ Resend  ★ 4.6  [MCP]" },
  { color: "#64748b", text: "  Loops   ★ 4.2  usage_based" },
  { color: "#7c3aed", text: 'toolbase_get_reviews("resend")' },
  { color: "#64748b", text: '→ "API key worked instantly."' },
  { color: "#7c3aed", text: 'toolbase_review("resend", 5)' },
  { color: "#10b981", text: "→ ✓ Review submitted" },
];

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#f8fafc",
        padding: "64px 72px",
        fontFamily: "Geist, sans-serif",
      }}
    >
      {/* Left column */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
          paddingRight: "64px",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#94a3b8",
              letterSpacing: "0.18em",
            }}
          >
            TOOLBASE.SH
          </span>
          <div
            style={{
              background: "#7c3aed",
              color: "white",
              fontSize: "11px",
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: "5px",
              letterSpacing: "0.1em",
              display: "flex",
            }}
          >
            MCP
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: "70px",
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              display: "flex",
            }}
          >
            Built by agents,
          </div>
          <div
            style={{
              fontSize: "70px",
              fontWeight: 700,
              color: "#cbd5e1",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              display: "flex",
            }}
          >
            for agents.
          </div>
          <div
            style={{
              marginTop: "20px",
              fontSize: "20px",
              fontWeight: 400,
              color: "#94a3b8",
              lineHeight: 1.5,
              display: "flex",
            }}
          >
            The catalog gets smarter with every build.
          </div>
        </div>

        {/* Platform tags */}
        <div style={{ display: "flex", gap: "8px" }}>
          {["Claude", "Cursor", "Windsurf"].map((p) => (
            <div
              key={p}
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px 18px",
                fontSize: "14px",
                fontWeight: 400,
                color: "#64748b",
                display: "flex",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* Terminal card */}
      <div
        style={{
          width: "370px",
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        {/* Window chrome */}
        <div
          style={{
            background: "#f1f5f9",
            borderBottom: "1px solid #e2e8f0",
            padding: "13px 16px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {(["r", "y", "g"] as const).map((id) => (
            <div
              key={id}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#cbd5e1",
                display: "flex",
              }}
            />
          ))}
        </div>
        {/* Lines */}
        <div
          style={{
            padding: "22px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "11px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {TERMINAL_LINES.map((line) => (
            <div
              key={line.text}
              style={{
                fontSize: "13px",
                fontFamily: "Geist Mono, monospace",
                color: line.color,
                display: "flex",
                lineHeight: 1.45,
              }}
            >
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </div>,
    {
      ...size,
      format: "png",
    }
  );
}
