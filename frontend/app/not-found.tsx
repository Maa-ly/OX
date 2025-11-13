'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

const NavWalletButton = dynamic(() => import('../components/nav-wallet-button').then(mod => ({ default: mod.NavWalletButton })), {
  ssr: false,
});

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/50 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                <span className="text-xl font-bold">O</span>
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight">ODX</div>
                <div className="text-xs text-zinc-400">Otaku Data Exchange</div>
              </div>
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/marketplace"
                className="hidden text-sm font-medium text-zinc-300 transition-colors hover:text-white sm:block"
              >
                Marketplace
              </Link>
              <Link
                href="/contribute"
                className="hidden text-sm font-medium text-zinc-300 transition-colors hover:text-white sm:block"
              >
                Contribute
              </Link>
              <NavWalletButton />
            </div>
          </div>
        </div>
      </nav>

      {/* 404 Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-12">
        <div className="relative max-w-2xl w-full">
          {/* Image Container */}
          <div className="relative">
            <img
              src="https://i.imgflip.com/480jjw.jpg"
              alt="Po holding empty scroll"
              className="w-full h-auto rounded-lg"
            />
            
            {/* 404 Text Overlay on Scroll */}
            <div 
              className="absolute text-center"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '55%',
                maxWidth: '350px',
                paddingTop: '2%',
              }}
            >
              <div className="text-5xl sm:text-6xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 mb-1">
                404
              </div>
              <div className="text-lg sm:text-xl font-semibold text-zinc-800 dark:text-zinc-200">
                Not Found
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-xl hover:shadow-cyan-500/30"
            >
              Go Home
            </Link>
            <Link
              href="/marketplace"
              className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-6 py-3 text-base font-semibold text-white transition-all hover:border-zinc-600 hover:bg-zinc-800/50"
            >
              Browse Marketplace
            </Link>
          </div>
          <p className="mt-6 text-center text-sm text-zinc-500">
            The page you're looking for doesn't exist
          </p>
        </div>
      </div>
    </div>
  );
}

