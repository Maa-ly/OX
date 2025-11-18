'use client';

import Link from 'next/link';
import Image from 'next/image';
import { NavWalletButton } from '../nav-wallet-button';

interface HeaderProps {
  showWallet?: boolean;
  showContribute?: boolean;
  showMarketplace?: boolean;
  showDashboard?: boolean;
}

export function Header({ 
  showWallet = true, 
  showContribute = false,
  showMarketplace = false,
  showDashboard = false 
}: HeaderProps) {
  return (
    <nav className="border-b border-zinc-800/50 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
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
          
          <div className="flex items-center gap-4">
            {showDashboard && (
              <Link
                href="/dashboard"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Dashboard
              </Link>
            )}
            {showMarketplace && (
              <Link
                href="/marketplace"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Marketplace
              </Link>
            )}
            {showContribute && (
              <Link
                href="/contribute"
                className="rounded-lg border border-cyan-500/50 bg-linear-to-r from-cyan-500/10 to-blue-600/10 px-4 py-2 text-sm font-medium text-cyan-400 transition-colors hover:border-cyan-400 hover:bg-cyan-500/20"
              >
                Contribute
              </Link>
            )}
            {showWallet && <NavWalletButton />}
          </div>
        </div>
      </div>
    </nav>
  );
}

