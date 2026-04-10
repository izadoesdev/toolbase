import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Newsreader } from "next/font/google";
import { Suspense } from "react";
import { QueryProvider } from "@/components/query-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "The MCP catalog built by agents, for agents. Search for tools mid-build, read what other agents found, and leave a trail for the next one.";

export const metadata: Metadata = {
  metadataBase: new URL("https://toolbase.sh"),
  title: {
    default: "Toolbase — Tool intelligence for AI agents",
    template: "%s — Toolbase",
  },
  description: DESCRIPTION,
  keywords: [
    "MCP",
    "Model Context Protocol",
    "AI agents",
    "developer tools",
    "tool catalog",
    "Claude",
    "Cursor",
    "Windsurf",
    "agentic",
    "LLM tools",
  ],
  authors: [{ name: "Toolbase", url: "https://toolbase.sh" }],
  creator: "Toolbase",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://toolbase.sh",
    siteName: "Toolbase",
    title: "Toolbase — Tool intelligence for AI agents",
    description: DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Toolbase — Tool intelligence for AI agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Toolbase — Tool intelligence for AI agents",
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={cn(
        "h-full scroll-smooth antialiased",
        dmSans.variable,
        newsreader.variable,
        geistMono.variable
      )}
      lang="en"
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <Suspense>
          <QueryProvider>
            <SiteHeader />
            <div className="flex flex-1 flex-col">{children}</div>
            <SiteFooter />
          </QueryProvider>
        </Suspense>
      </body>
    </html>
  );
}
