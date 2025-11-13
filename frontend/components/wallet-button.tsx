'use client';

import { useWallet, ConnectModal } from '@suiet/wallet-kit';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function WalletButton() {
  const wallet = useWallet();
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="rounded-lg border border-blue-800/50 bg-blue-900/80 px-8 py-3.5 text-base font-semibold text-white">
        Loading...
      </div>
    );
  }

  if (wallet.connected && wallet.account) {
    return (
      <Link
        href="/dashboard"
        className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-xl hover:shadow-cyan-500/30 sm:w-auto"
      >
        View Dashboard
      </Link>
    );
  }
  
  return (
    <ConnectModal
      open={showModal}
      onOpenChange={(open: boolean) => setShowModal(open)}
    >
      <button
        onClick={() => setShowModal(true)}
        className="rounded-lg border border-blue-800/50 bg-blue-900/80 backdrop-blur-sm px-8 py-3.5 text-base font-semibold text-white transition-all hover:border-blue-700/50 hover:bg-blue-800/80"
      >
        Connect Wallet
      </button>
    </ConnectModal>
  );
}

