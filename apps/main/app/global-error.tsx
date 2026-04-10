"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          backgroundColor: "#09090b",
          color: "#fafafa",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div
            style={{
              border: "1px solid #27272a",
              borderRadius: "12px",
              padding: "1.5rem 2rem",
              marginBottom: "1.5rem",
              backgroundColor: "#18181b",
            }}
          >
            <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>
              fatal error
            </p>
            <p
              style={{
                color: "#71717a",
                fontSize: "12px",
                marginTop: "6px",
                marginBottom: 0,
              }}
            >
              {error.message || "An unexpected error occurred"}
            </p>
          </div>
          <button
            onClick={reset}
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              color: "#fafafa",
              padding: "8px 16px",
              fontSize: "12px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            type="button"
          >
            reload page
          </button>
        </div>
      </body>
    </html>
  );
}
