import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  title: "ODX - Otaku Data Exchange | Trade Anime & Manga Engagement Data",
  description:
    "ODX is a data marketplace where fans trade tokens representing engagement and popularity of anime, manga, and manhwa IPs. Own your fandom data and profit from your contributions.",
  keywords: [
    "anime",
    "manga",
    "data marketplace",
    "blockchain",
    "Sui",
    "NFT",
    "engagement data",
    "fandom",
    "otaku",
    "Web3",
  ],
  authors: [{ name: "ODX Team" }],
  openGraph: {
    title: "ODX - Otaku Data Exchange",
    description:
      "Transform your anime and manga engagement into tradable assets. Own your data, contribute to your favorite IPs, and profit from the cultural value you create.",
    type: "website",
    locale: "en_US",
    siteName: "ODX - Otaku Data Exchange",
  },
  twitter: {
    card: "summary_large_image",
    title: "ODX - Otaku Data Exchange",
    description:
      "The Stock Market for Fandom Data. Trade anime & manga engagement on the blockchain.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

// Viewport must be exported separately in Next.js 16+
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${outfit.variable} antialiased font-sans`}
        style={{ fontFamily: "var(--font-outfit)" }}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
