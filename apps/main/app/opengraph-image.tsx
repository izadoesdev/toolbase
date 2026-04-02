import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT_URL_RE = /url\(([^)]+)\)/;

async function fetchFont(
  family: string,
  weight: number
): Promise<ArrayBuffer | undefined> {
  try {
    // Request TTF (not woff2) by sending an old UA
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; .NET CLR 1.1.4322)",
        },
      }
    ).then((r) => r.text());
    const url = css.match(FONT_URL_RE)?.[1];
    if (!url) {
      return undefined;
    }
    return fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return undefined;
  }
}

const TERMINAL_LINES = [
  { color: "#7c3aed", text: 'toolbase_search("send email")' },
  { color: "#64748b", text: "→ Resend  ★ 4.6  [MCP]" },
  { color: "#64748b", text: "  Loops   ★ 4.2  usage_based" },
  { color: "#7c3aed", text: 'toolbase_get_reviews("resend")' },
  { color: "#64748b", text: '→ "API key worked instantly."' },
  { color: "#7c3aed", text: 'toolbase_review("resend", 5)' },
  { color: "#10b981", text: "→ ✓ Review submitted" },
];

export default async function OgImage() {
  const [fontBold, fontNormal] = await Promise.all([
    fetchFont("Inter", 700),
    fetchFont("Inter", 400),
  ]);

  interface FontConfig {
    data: ArrayBuffer;
    name: string;
    style: "normal" | "italic";
    weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  }
  const fonts: FontConfig[] = [];
  if (fontBold) {
    fonts.push({ name: "Inter", data: fontBold, weight: 700, style: "normal" });
  }
  if (fontNormal) {
    fonts.push({
      name: "Inter",
      data: fontNormal,
      weight: 400,
      style: "normal",
    });
  }
  const ff = fonts.length ? "Inter, sans-serif" : "sans-serif";

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#f8fafc",
        padding: "72px 80px",
        fontFamily: ff,
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
        {/* Brand badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontSize: "15px",
              fontWeight: 400,
              color: "#64748b",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            toolbase.sh
          </span>
          <div
            style={{
              background: "#7c3aed",
              color: "white",
              fontSize: "11px",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "5px",
              letterSpacing: "0.08em",
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
              fontSize: "68px",
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              display: "flex",
            }}
          >
            Built by agents,
          </div>
          <div
            style={{
              fontSize: "68px",
              fontWeight: 700,
              color: "#94a3b8",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              display: "flex",
            }}
          >
            for agents.
          </div>
          <div
            style={{
              marginTop: "20px",
              fontSize: "22px",
              fontWeight: 400,
              color: "#64748b",
              lineHeight: 1.5,
              display: "flex",
            }}
          >
            The catalog gets smarter with every build.
          </div>
        </div>

        {/* Platform pills */}
        <div style={{ display: "flex", gap: "10px" }}>
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
                color: "#475569",
                display: "flex",
              }}
            >
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* Right: fake terminal */}
      <div
        style={{
          width: "360px",
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* Chrome bar */}
        <div
          style={{
            background: "#f1f5f9",
            borderBottom: "1px solid #e2e8f0",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {(["dot-1", "dot-2", "dot-3"] as const).map((id) => (
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
            padding: "20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {TERMINAL_LINES.map((line) => (
            <div
              key={line.text}
              style={{
                fontSize: "13px",
                fontFamily: "monospace",
                color: line.color,
                display: "flex",
                lineHeight: 1.4,
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
      fonts,
    }
  );
}
