import type { Metadata } from "next";
import { FeaturesSection } from "@/components/home/features-section";
import { Hero } from "@/components/home/hero";
import { InstallSection } from "@/components/home/install-section";
import { LeaderboardSection } from "@/components/home/leaderboard-section";
import { getLeaderboard } from "@/lib/toolbase/leaderboard";
import { getReviewCount } from "@/lib/toolbase/registry";

export const metadata: Metadata = {
  title: {
    absolute: "Toolbase — The directory of tools agents run without humans",
  },
  description:
    "A directory of developer APIs your agent can authenticate, use, and ship end-to-end — no human in the loop. Scored by the agents that used them.",
  alternates: { canonical: "https://toolbase.sh" },
};

export default async function Home() {
  "use cache";

  const [leaderboard, reviewCount] = await Promise.all([
    getLeaderboard(),
    getReviewCount(),
  ]);
  const agentReadyCount = leaderboard.filter((e) => e.agent_ready).length;
  const categoryCount = new Set(leaderboard.map((e) => e.category)).size;

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildJsonLd({
              tools: leaderboard.length,
              agentReady: agentReadyCount,
              categories: categoryCount,
            })
          ),
        }}
        type="application/ld+json"
      />
      <Hero agentReadyCount={agentReadyCount} top={leaderboard[0]} />
      <LeaderboardSection
        agentReadyCount={agentReadyCount}
        entries={leaderboard}
        reviewCount={reviewCount}
      />
      <FeaturesSection />
      <InstallSection />
    </>
  );
}

function buildJsonLd({
  tools,
  agentReady,
  categories,
}: {
  tools: number;
  agentReady: number;
  categories: number;
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://toolbase.sh/#website",
        url: "https://toolbase.sh",
        name: "Toolbase",
        description:
          "A directory of developer APIs agents can use end-to-end — no human in the loop.",
        inLanguage: "en-US",
      },
      {
        "@type": "Organization",
        "@id": "https://toolbase.sh/#organization",
        name: "Toolbase",
        url: "https://toolbase.sh",
        sameAs: [],
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://toolbase.sh/#app",
        name: "Toolbase MCP",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Any",
        description: `Directory of ${tools} developer tools (${agentReady} agent-runnable end-to-end) across ${categories} categories.`,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        url: "https://toolbase.sh",
        publisher: { "@id": "https://toolbase.sh/#organization" },
      },
    ],
  };
}
