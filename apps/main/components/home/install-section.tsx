import { CopyButton } from "@/components/home/copy-button";
import { McpInstallButtons } from "@/components/home/mcp-install-buttons";

const MCP_URL = "https://toolbase.sh/api/mcp";

const MCP_CONFIG = `{
  "mcpServers": {
    "toolbase": {
      "url": "${MCP_URL}"
    }
  }
}`;

export function InstallSection() {
  return (
    <section className="border-[#262626] border-t" id="install">
      <div className="mx-auto w-full max-w-[1232px] px-6 py-24">
        <div className="flex flex-col gap-6">
          <span className="font-mono text-[#9c9ca6] text-[11px] uppercase tracking-[0.25em]">
            05 / Install
          </span>
          <h2 className="max-w-[720px] font-semibold text-[36px] text-white leading-[1.05] tracking-[-1px] sm:text-[44px]">
            One config.{" "}
            <span className="text-[#9c9ca6]">
              Your agent handles the rest.
            </span>
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Track A: for the agent */}
          <div className="relative flex flex-col gap-5 border border-[#262626] bg-[#0a0a0a] p-6">
            <span className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent_0%,#9ece6a_50%,transparent_100%)]" />
            <div className="flex items-center gap-2">
              <span className="inline-block size-1.5 rounded-full bg-[#9ece6a]" />
              <span className="font-mono text-[#9ece6a] text-[11px] uppercase tracking-[0.2em]">
                For your agent
              </span>
            </div>
            <h3 className="font-semibold text-[22px] text-white leading-[1.2] tracking-[-0.3px]">
              Give it this URL. It handles the rest.
            </h3>
            <p className="text-[#9c9ca6] text-[14px] leading-[22px]">
              One MCP endpoint. Every tool in the registry behind it. Auth is
              an API key or none — your agent never hits a consent screen.
            </p>

            <div className="mt-2 flex items-center justify-between gap-3 border border-[#262626] bg-[#060606] px-4 py-3">
              <code className="truncate font-mono text-[#e5e5e5] text-[14px] tracking-[0.01em]">
                {MCP_URL}
              </code>
              <CopyButton text={MCP_URL} />
            </div>

            <dl className="mt-1 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px]">
              <div className="flex items-baseline gap-1.5">
                <dt className="text-[#595959] uppercase tracking-[0.1em]">
                  transport
                </dt>
                <dd className="text-[#d4d4d4]">http + sse</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-[#595959] uppercase tracking-[0.1em]">
                  auth
                </dt>
                <dd className="text-[#9ece6a]">api key · none</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-[#595959] uppercase tracking-[0.1em]">
                  human oauth
                </dt>
                <dd className="text-[#9ece6a]">never</dd>
              </div>
            </dl>
          </div>

          {/* Track B: for the human */}
          <div className="relative flex flex-col gap-5 border border-[#262626] bg-[#0a0a0a] p-6">
            <span className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent_0%,#595959_50%,transparent_100%)]" />
            <div className="flex items-center gap-2">
              <span className="inline-block size-1.5 rounded-full bg-[#d4d4d4]" />
              <span className="font-mono text-[#d4d4d4] text-[11px] uppercase tracking-[0.2em]">
                For you
              </span>
            </div>
            <h3 className="font-semibold text-[22px] text-white leading-[1.2] tracking-[-0.3px]">
              One click. Hand it off. Done.
            </h3>
            <p className="text-[#9c9ca6] text-[14px] leading-[22px]">
              Pick your client. We'll open it or copy the config. Paste once,
              your agent starts using tools on the next run.
            </p>

            <div className="mt-1">
              <McpInstallButtons />
            </div>

            <details className="group mt-1 border border-[#262626] bg-[#060606]">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 font-mono text-[#9c9ca6] text-[11px] uppercase tracking-[0.15em] transition-colors hover:text-white">
                <span>mcp.json</span>
                <span className="text-[#595959] transition-transform group-open:rotate-90">
                  ›
                </span>
              </summary>
              <div className="flex items-center justify-between border-[#262626] border-t bg-[#0a0a0a] px-4 py-2">
                <span className="font-mono text-[#595959] text-[10px] uppercase tracking-[0.15em]">
                  paste into any MCP client
                </span>
                <CopyButton text={MCP_CONFIG} />
              </div>
              <pre className="overflow-auto p-4 font-mono text-[#a9b1d6] text-[12px] leading-[1.6]">
                {MCP_CONFIG}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}
