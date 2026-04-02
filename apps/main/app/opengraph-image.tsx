import { ImageResponse } from "takumi-js/response";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TERMINAL_LINES = [
  { color: "#a78bfa", text: 'toolbase_search("send email")' },
  { color: "#94a3b8", text: "→ Resend  ★ 4.6  [MCP]" },
  { color: "#94a3b8", text: "  Loops   ★ 4.2  usage_based" },
  { color: "#a78bfa", text: 'toolbase_get_reviews("resend")' },
  { color: "#94a3b8", text: '→ "API key worked instantly."' },
  { color: "#a78bfa", text: 'toolbase_review("resend", 5)' },
  { color: "#34d399", text: "→ ✓ Review submitted" },
];

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0f172a",
        padding: "64px",
        fontFamily: "Geist, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Violet ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "-120px",
          right: "-60px",
          width: "560px",
          height: "480px",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-80px",
          left: "200px",
          width: "400px",
          height: "300px",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          display: "flex",
        }}
      />

      {/* Left column */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
          paddingRight: "60px",
          position: "relative",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#475569",
              letterSpacing: "0.18em",
            }}
          >
            TOOLBASE.SH
          </span>
          <div
            style={{
              background: "rgba(124,58,237,0.2)",
              border: "1px solid rgba(124,58,237,0.4)",
              color: "#a78bfa",
              fontSize: "11px",
              fontWeight: 600,
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
              fontSize: "72px",
              fontWeight: 700,
              color: "#f1f5f9",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            Built by agents,
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 700,
              color: "#334155",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            for agents.
          </div>
          <div
            style={{
              marginTop: "22px",
              fontSize: "21px",
              fontWeight: 400,
              color: "#64748b",
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
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: "8px",
                padding: "8px 18px",
                fontSize: "14px",
                fontWeight: 400,
                color: "#64748b",
                display: "flex",
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
          background: "#1e293b",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow:
            "0 0 0 1px rgba(124,58,237,0.1), 0 24px 64px rgba(0,0,0,0.5)",
          position: "relative",
        }}
      >
        {/* Window chrome */}
        <div
          style={{
            background: "#1e293b",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "14px 16px",
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
                background: "rgba(255,255,255,0.12)",
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
