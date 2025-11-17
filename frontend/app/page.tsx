"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { HeroCarousel } from "../components/hero-carousel";
import { MobileBottomNav, MobileSidebar } from "@/components/mobile-nav";

// Dynamically import wallet components with SSR disabled to avoid WalletContext errors
const WalletButton = dynamic(
  () =>
    import("../components/wallet-button").then((mod) => ({
      default: mod.WalletButton,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-8 py-3.5 text-base font-semibold text-white sm:w-auto">
        Loading...
      </div>
    ),
  }
);

const NavWalletButton = dynamic(
  () =>
    import("../components/nav-wallet-button").then((mod) => ({
      default: mod.NavWalletButton,
    })),
  {
    ssr: false,
  }
);

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden pb-20 md:pb-0">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Hamburger Menu - Mobile Only */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              <Link
                href="/"
                className="flex items-center gap-3 group cursor-pointer"
              >
                <div className="flex h-10 w-10 items-center justify-center transition-transform group-hover:scale-110">
                  <Image
                    src="/favicon.svg"
                    alt="ODX Logo"
                    width={40}
                    height={40}
                    className="w-10 h-10"
                  />
                </div>
                <div className="hidden sm:block">
                  <div className="text-lg font-bold tracking-tight">ODX</div>
                  <div className="text-xs text-zinc-400">Otaku Data Exchange</div>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/markets"
                className="hidden text-sm font-medium text-zinc-300 transition-colors hover:text-white md:block"
              >
                Markets
              </Link>
              <Link
                href="/trade"
                className="hidden text-sm font-medium text-zinc-300 transition-colors hover:text-white md:block"
              >
                Trade
              </Link>
              <Link
                href="/discover"
                className="hidden text-sm font-medium text-zinc-300 transition-colors hover:text-white md:block"
              >
                Discover
              </Link>
              <Link
                href="/predictions"
                className="hidden text-sm font-medium text-zinc-300 transition-colors hover:text-white md:block"
              >
                Predictions
              </Link>
              <NavWalletButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden h-screen w-full">
        {/* Background Carousel */}
        <div className="absolute inset-0 z-0">
          <HeroCarousel />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 backdrop-blur-sm px-4 py-1.5 text-sm text-cyan-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                Live on Sui Testnet
              </div>

              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl text-white drop-shadow-lg">
                <span className="block">The Stock Market</span>
                <span className="block bg-linear-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  for Fandom Data
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/90 drop-shadow-md sm:text-xl">
                Transform your anime and manga engagement into tradable assets.
                Own your data, contribute to your favorite IPs, and profit from
                the cultural value you create.
              </p>

              <div className="mt-10 flex items-center justify-center gap-4">
                <WalletButton />
                <a
                  href="#how-it-works"
                  className="rounded-lg border border-blue-800/50 bg-blue-900/80 backdrop-blur-sm px-8 py-3.5 text-base font-semibold text-white transition-all hover:border-blue-700/50 hover:bg-blue-800/80"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Concept */}
      <section className="py-24 sm:py-32 relative z-20 bg-[#0a0a0f]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-base font-semibold uppercase tracking-wide text-cyan-400">
              The Concept
            </h2>
            <p className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Stock Market for Fandom Engagement
            </p>
            <p className="mt-6 text-lg leading-8 text-zinc-400">
              Think of ODX as a stock market, but instead of trading company
              shares, you trade tokens that represent the engagement and
              popularity of anime, manga, and manhwa IPs.
            </p>
          </div>

          <div className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-linear-to-br from-zinc-900/50 to-zinc-900/30 p-8 transition-all hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl transition-all group-hover:bg-cyan-500/20" />
              <div className="relative">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500 to-blue-600">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">
                  Data is the Commodity
                </h3>
                <p className="mt-3 text-zinc-400">
                  Your engagement data—ratings, predictions, memes,
                  reviews—becomes a valuable, tradable asset stored on
                  decentralized Walrus storage.
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-linear-to-br from-zinc-900/50 to-zinc-900/30 p-8 transition-all hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl transition-all group-hover:bg-blue-500/20" />
              <div className="relative">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-cyan-600">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">
                  Fans Own the Data
                </h3>
                <p className="mt-3 text-zinc-400">
                  Every contribution is cryptographically signed with your
                  wallet, proving ownership and ensuring you control your
                  engagement data.
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-linear-to-br from-zinc-900/50 to-zinc-900/30 p-8 transition-all hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl transition-all group-hover:bg-cyan-500/20" />
              <div className="relative">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500 to-blue-600">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">
                  Contributors Get Rewarded
                </h3>
                <p className="mt-3 text-zinc-400">
                  Early contributors and accurate predictors earn tokens from
                  the reserve pool, proportional to their impact on IP
                  popularity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="border-t border-zinc-800 bg-zinc-950/50 py-24 sm:py-32 relative z-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-base font-semibold uppercase tracking-wide text-cyan-400">
              How It Works
            </h2>
            <p className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              From Engagement to Asset
            </p>
          </div>

          <div className="mx-auto mt-20 max-w-5xl">
            <div className="space-y-12">
              {[
                {
                  number: "01",
                  title: "Create & Sign Your Contribution",
                  description:
                    "Rate anime, make predictions, post memes, or leave reviews. Each contribution is signed with your wallet and stored on Walrus decentralized storage.",
                },
                {
                  number: "02",
                  title: "Data Aggregation & Metrics",
                  description:
                    "The oracle service aggregates all contributions, verifies signatures, and calculates engagement metrics that feed into token price calculations.",
                },
                {
                  number: "03",
                  title: "Token Value Reflects Engagement",
                  description:
                    "As engagement grows—higher ratings, accurate predictions, viral content—the IP token price increases, reflecting the cultural value you helped create.",
                },
                {
                  number: "04",
                  title: "Trade & Profit",
                  description:
                    "Buy and sell IP tokens on the marketplace, trade perpetual futures, and earn rewards as an early contributor or accurate predictor.",
                },
              ].map((step, index) => (
                <div key={index} className="relative flex gap-8">
                  <div className="flex flex-col items-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-500 to-blue-600 text-2xl font-bold text-white shadow-lg shadow-cyan-500/25">
                      {step.number}
                    </div>
                    {index < 3 && (
                      <div className="mt-4 h-full w-0.5 bg-linear-to-b from-cyan-500/50 to-transparent" />
                    )}
                  </div>
                  <div className="flex-1 pb-12">
                    <h3 className="text-2xl font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-lg leading-7 text-zinc-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="py-24 sm:py-32 relative z-20 bg-[#0a0a0f]"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-base font-semibold uppercase tracking-wide text-cyan-400">
              Key Features
            </h2>
            <p className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Everything You Need
            </p>
          </div>

          <div className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              {
                title: "True Data Ownership",
                description:
                  "Your engagement data is cryptographically signed and stored on Walrus, giving you complete ownership and control.",
                icon: (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                ),
              },
              {
                title: "Attribution & Rewards",
                description:
                  "Track who contributed what and earn tokens for early engagement and accurate predictions.",
                icon: (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.228a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
                    />
                  </svg>
                ),
              },
              {
                title: "Trading & Speculation",
                description:
                  "Buy and sell IP tokens like stocks, trade perpetual futures, and profit from engagement trends.",
                icon: (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.94"
                    />
                  </svg>
                ),
              },
              {
                title: "Transparency",
                description:
                  "All data is stored on decentralized Walrus, with public analytics and verifiable engagement metrics.",
                icon: (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                ),
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-linear-to-br from-zinc-900/50 to-zinc-900/30 p-6 transition-all hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-linear-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800 bg-linear-to-br from-zinc-950 to-zinc-900 py-24 sm:py-32 relative z-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Ready to Transform Your Fandom?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Join ODX and turn your passion for anime and manga into a valuable
            asset. Your engagement data is worth something—own it.
          </p>
          <div className="mt-10 flex items-center justify-center">
            <NavWalletButton />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 relative z-20">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <Link
              href="/"
              className="mb-4 inline-flex items-center justify-center gap-3 group cursor-pointer"
            >
              <div className="flex h-10 w-10 items-center justify-center transition-transform group-hover:scale-110">
                <Image
                  src="/favicon.svg"
                  alt="ODX Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10"
                />
              </div>
              <div className="text-left">
                <div className="text-lg font-bold">ODX</div>
                <div className="text-xs text-zinc-400">Otaku Data Exchange</div>
              </div>
            </Link>
            <p className="text-sm text-zinc-500">
              Built on Sui Blockchain • Powered by Walrus Storage
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
