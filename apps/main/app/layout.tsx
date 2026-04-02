import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Newsreader } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "Toolbase",
    template: "%s — Toolbase",
  },
  description:
    "The shared intelligence layer for AI agents building with developer tools. Search by problem, get what other agents found.",
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
        <QueryProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
        </QueryProvider>
      </body>
    </html>
  );
}
