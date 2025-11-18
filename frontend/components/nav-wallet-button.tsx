'use client';

import { useWalletAuth } from '@/lib/hooks/useWalletAuth';
import { useZkLogin } from '@/lib/hooks/useZkLogin';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ConnectionModal } from './connection-modal';
import { useEffect, useState } from 'react';

export function NavWalletButton() {
  const { wallet, isConnected: walletConnected, address: walletAddress } = useWalletAuth();
  const { isAuthenticated: zkLoginAuthenticated, address: zkLoginAddress, signOut: zkLoginSignOut } = useZkLogin();
  const { clearAllAuth } = useAuthStore();
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

  const isConnected = walletConnected || zkLoginAuthenticated;
  const address = walletAddress || zkLoginAddress;

  if (isConnected && address) {
    return (
      <button
        onClick={() => {
          if (walletConnected) {
            wallet.disconnect();
            clearAllAuth();
          } else if (zkLoginAuthenticated) {
            zkLoginSignOut();
            clearAllAuth();
            setTimeout(() => window.location.reload(), 100);
          }
        }}
        className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-zinc-600 hover:bg-zinc-800/50"
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="rounded-lg border border-blue-800/50 bg-blue-900/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white transition-colors hover:border-blue-700/50 hover:bg-blue-800/80"
      >
        Connect Wallet
      </button>
      <ConnectionModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
}

