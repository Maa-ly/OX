'use client';

import { useWallet, ConnectModal } from '@suiet/wallet-kit';
import { useEffect, useState } from 'react';

export function NavWalletButton() {
  const wallet = useWallet();
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        disabled
        className="rounded-lg border border-blue-800/50 bg-blue-900/80 px-4 py-2 text-sm font-medium text-white"
      >
        Loading...
      </button>
    );
  }

  if (wallet.connected && wallet.account) {
    return (
      <button
        onClick={() => wallet.disconnect()}
        className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-zinc-600 hover:bg-zinc-800/50"
      >
        {wallet.account.address.slice(0, 6)}...{wallet.account.address.slice(-4)}
      </button>
    );
  }

  return (
    <ConnectModal
      open={showModal}
      onOpenChange={(open: boolean) => setShowModal(open)}
    >
      <button
        onClick={() => setShowModal(true)}
        className="rounded-lg border border-blue-800/50 bg-blue-900/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white transition-colors hover:border-blue-700/50 hover:bg-blue-800/80"
      >
        Connect Wallet
      </button>
    </ConnectModal>
  );
}

