import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";
import "./globals.css";

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
    "Headless agent & MCP tool library—same registry in the UI and over HTTP; MCP-ready entries flagged in data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={cn("h-full scroll-smooth", geistMono.variable)}
      lang="en"
      style={{ fontFamily: "'Tahoma', 'MS Sans Serif', Arial, sans-serif" }}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground" style={{ fontFamily: "'Tahoma', 'MS Sans Serif', Arial, sans-serif", fontSize: '11px' }}>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
