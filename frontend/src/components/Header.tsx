'use client'

import { ConnectButton } from '@mysten/dapp-kit'
import Link from 'next/link'

export default function Header() {

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-[#2a2a2a]">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-white">
              ODX
            </div>
            <span className="text-sm text-gray-400">Otaku Data Exchange</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-white hover:text-[#dc2626] transition-colors">
              Home
            </Link>
            <Link href="/marketplace" className="text-white hover:text-[#dc2626] transition-colors">
              Marketplace
            </Link>
            <Link href="/dashboard" className="text-white hover:text-[#dc2626] transition-colors">
              Dashboard
            </Link>
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  )
}

