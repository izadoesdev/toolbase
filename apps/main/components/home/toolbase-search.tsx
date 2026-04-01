"use client";

import { useCallback, useState, useTransition } from "react";
import { searchToolbase } from "@/app/actions/toolbase";
import type { Product } from "@/lib/toolbase/schema";

interface Hit {
  category: string;
  description: string;
  docs_url: string;
  id: string;
  mcp_supported: boolean;
  name: string;
}

const SUGGESTIONS = [
  "mcp server tools",
  "agent auth stack",
  "postgres serverless",
  "observability api",
];

function SearchResults({
  results,
  preview,
  pending,
}: {
  results: Hit[] | null;
  preview: Product[];
  pending: boolean;
}) {
  if (results === null) {
    return (
      <section>
        <p style={{ fontSize: "10px", fontWeight: "bold", color: "#444444", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          In the catalog
        </p>
        <div className="win-listbox" style={{ background: "#ffffff", width: "100%" }}>
          {preview.map((p, i) => (
            <div
              className="win-listbox-item"
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "3px 6px",
                fontSize: "11px",
                borderBottom: i < preview.length - 1 ? "1px solid #d4d0c8" : "none",
                cursor: "default",
              }}
            >
              <span style={{ color: "#000000" }}>{p.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {p.mcp.supported ? (
                  <span style={{
                    border: "1px solid #808080",
                    background: "#d4d0c8",
                    padding: "1px 4px",
                    fontSize: "9px",
                    fontWeight: "bold",
                    color: "#000000",
                    fontFamily: "'Courier New', monospace",
                  }}>
                    MCP
                  </span>
                ) : null}
                <span style={{ fontSize: "9px", color: "#444444" }}>
                  {p.category}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (results.length === 0) {
    return (
      <div className="win-inset-panel" style={{ padding: "12px", background: "#ece9d8" }}>
        <p style={{ fontSize: "11px", color: "#444444" }}>
          Nothing matched that yet. Try different words or one of the suggestions above.
        </p>
      </div>
    );
  }

  return (
    <div className="win-listbox" style={{ background: "#ffffff" }}>
      {results.map((hit, i) => (
        <div
          className="win-listbox-item"
          key={hit.id}
          style={{
            padding: "6px 8px",
            fontSize: "11px",
            borderBottom: i < results.length - 1 ? "1px solid #d4d0c8" : "none",
            cursor: "default",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
            <strong style={{ color: "#000000" }}>{hit.name}</strong>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {hit.mcp_supported ? (
                <span style={{
                  border: "1px solid #808080",
                  background: "#d4d0c8",
                  padding: "1px 4px",
                  fontSize: "9px",
                  fontWeight: "bold",
                  color: "#000000",
                  fontFamily: "'Courier New', monospace",
                }}>
                  MCP
                </span>
              ) : null}
              <span style={{
                background: "#d4d0c8",
                border: "1px solid #808080",
                padding: "1px 4px",
                fontSize: "9px",
                color: "#000000",
              }}>
                {hit.category}
              </span>
              {hit.docs_url ? (
                <a
                  href={hit.docs_url}
                  rel="noopener noreferrer"
                  style={{
                    background: "#d4d0c8",
                    border: "1px solid #808080",
                    padding: "1px 4px",
                    fontSize: "9px",
                    color: "#0000ff",
                    textDecoration: "underline",
                  }}
                  target="_blank"
                >
                  Docs ↗
                </a>
              ) : null}
            </span>
          </div>
          <p style={{ fontSize: "10px", color: "#444444", lineHeight: "1.4" }}>{hit.description}</p>
        </div>
      ))}
    </div>
  );
}

export function ToolbaseSearch({ preview }: { preview: Product[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Hit[] | null>(null);
  const [pending, startTransition] = useTransition();

  const runSearch = useCallback((q: string) => {
    startTransition(() => {
      searchToolbase(q).then(({ results: next }) => {
        setResults(next);
      });
    });
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  return (
    <div className="win-inset-panel" style={{ padding: "12px", background: "#d4d0c8" }}>
      <div className="win-title-bar" style={{ marginBottom: "10px" }}>
        <span>🔍</span>
        <span>Search the Catalog</span>
      </div>

      {/* Search form */}
      <form
        style={{ display: "flex", gap: "6px", marginBottom: "10px", alignItems: "center" }}
        onSubmit={onSubmit}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "2px" }}>
          <label htmlFor="win-search-input" style={{ fontSize: "11px", color: "#000000" }}>
            Search:
          </label>
          <input
            aria-label="Search tools"
            autoComplete="off"
            className="win-input"
            id="win-search-input"
            name="q"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. auth, email, database…"
            style={{ width: "100%", height: "22px" }}
            value={query}
          />
        </div>
        <button
          className="win-button"
          disabled={pending}
          style={{ marginTop: "16px", minWidth: "80px" }}
          type="submit"
        >
          {pending ? "Searching..." : "Search"}
        </button>
      </form>

      {/* Suggestions */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px", marginBottom: "10px" }}>
        {results !== null && (
          <button
            className="win-button"
            onClick={() => setResults(null)}
            style={{ fontSize: "10px", minWidth: "50px", padding: "2px 8px" }}
            type="button"
          >
            ← Back
          </button>
        )}
        <span style={{ fontSize: "10px", color: "#444444" }}>Try:</span>
        {SUGGESTIONS.map((s) => (
          <button
            className="win-button"
            key={s}
            onClick={() => {
              setQuery(s);
              runSearch(s);
            }}
            style={{ fontSize: "10px", padding: "1px 6px", minWidth: "auto" }}
            type="button"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ opacity: pending ? 0.5 : 1 }}>
        <SearchResults pending={pending} preview={preview} results={results} />
      </div>
    </div>
  );
}
