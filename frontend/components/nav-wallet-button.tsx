'use client';

import { useWalletAuth } from '@/lib/hooks/useWalletAuth';
import { useZkLogin } from '@/lib/hooks/useZkLogin';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ConnectionModal } from './connection-modal';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, ArrowUpRight, ChevronDown, LogOut } from 'lucide-react';

export function NavWalletButton() {
  const { wallet, isConnected: walletConnected, address: walletAddress } = useWalletAuth();
  const { isAuthenticated: zkLoginAuthenticated, address: zkLoginAddress, signOut: zkLoginSignOut } = useZkLogin();
  const { clearAllAuth } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpenMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isConnected = walletConnected || zkLoginAuthenticated;
  const address = walletAddress || zkLoginAddress;
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

  const explorerUrl = (addr: string) => {
    if (network === 'mainnet') return `https://suiscan.xyz/mainnet/account/${addr}`;
    if (network === 'devnet') return `https://devnet.suiscan.xyz/account/${addr}`;
    return `https://suiscan.xyz/account/${addr}`;
  };


  if (isConnected && address) {
    return (
      <>
      <div ref={containerRef} className="relative">
        <button
          onClick={() => setOpenMenu((v) => !v)}
          className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-zinc-600 hover:bg-zinc-800/50 flex items-center gap-2"
        >
          {address.slice(0, 6)}...{address.slice(-4)}
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        </button>
        {openMenu && (
          <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-cyan-500/30 bg-zinc-900/60 backdrop-blur-xl shadow-xl">
            <div className="px-4 py-3 border-b border-white/10 text-white font-semibold">
              @{address.slice(0, 6)}...{address.slice(-4)}
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(address);
                    setToastMsg('Address copied');
                    setTimeout(() => setToastMsg(null), 1600);
                  } catch {}
                }}
                className="flex flex-col items-center gap-1 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200 py-3"
              >
                <Copy className="w-5 h-5" />
                <span className="text-xs font-medium">Copy</span>
              </button>
              <button
                onClick={() => {
                  const url = explorerUrl(address);
                  window.open(url, '_blank');
                  setOpenMenu(false);
                }}
                className="flex flex-col items-center gap-1 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200 py-3"
              >
                <ArrowUpRight className="w-5 h-5" />
                <span className="text-xs font-medium">Explorer</span>
              </button>
              <button
                onClick={() => {
                  if (walletConnected) {
                    wallet.disconnect();
                  } else if (zkLoginAuthenticated) {
                    zkLoginSignOut();
                  }
                  clearAllAuth();
                  setOpenMenu(false);
                  setTimeout(() => window.location.reload(), 100);
                }}
                className="flex flex-col items-center gap-1 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200 py-3"
              >
                <LogOut className="w-5 h-5 text-pink-400" />
                <span className="text-xs font-medium">Disconnect</span>
              </button>
            </div>
          </div>
        )}
      </div>
      {toastMsg && createPortal(
        <div className="fixed top-4 right-4 z-9999">
          <div className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-zinc-900/80 backdrop-blur-md px-3 py-2 shadow-lg">
            <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-medium text-cyan-300">{toastMsg}</span>
          </div>
        </div>, document.body)}
      </>
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

