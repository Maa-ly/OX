'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ConnectModal, useWallet } from '@suiet/wallet-kit';
import { useZkLogin } from '@/lib/hooks/useZkLogin';

interface ConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Connection Modal
 * Shows two connection options:
 * 1. Connect Wallet (using Sui wallet-kit)
 * 2. Sign in with Google (using zkLogin)
 */
export function ConnectionModal({ open, onOpenChange }: ConnectionModalProps) {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { signIn } = useZkLogin();
  const wallet = useWallet();

  // Ensure we're mounted (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close modal when wallet connects
  useEffect(() => {
    if (wallet.connected) {
      // Close both modals when wallet connects
      setShowWalletModal(false);
      if (open) {
        onOpenChange(false);
      }
    }
  }, [wallet.connected, open, onOpenChange]);

  const handleWalletConnect = () => {
    // Close the connection modal first so wallet-kit modal is visible
    onOpenChange(false);
    // Small delay to ensure connection modal closes before wallet modal opens
    setTimeout(() => {
      setShowWalletModal(true);
    }, 100);
  };

  const handleZkLogin = async () => {
    // Close this modal first
    onOpenChange(false);
    // Then initiate zkLogin flow
    await signIn();
  };

  // Render modal using portal to ensure it's always on top
  const modalContent = open && mounted ? (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-9998"
            onClick={() => onOpenChange(false)}
          />

          {/* Modal content - centered */}
          <div className="relative z-9999 w-full max-w-md my-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Connect to ODX</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Choose how you want to connect to ODX
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white transition-colors"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Connection options */}
            <div className="space-y-3">
              {/* Option 1: Connect Wallet */}
              <button
                onClick={handleWalletConnect}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-left transition-all hover:border-blue-500/50 hover:bg-zinc-800"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                    <svg
                      className="h-6 w-6 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">Connect Wallet</h3>
                    <p className="text-sm text-zinc-400">
                      Use Sui Wallet, Suiet, or other Sui wallets
                    </p>
                  </div>
                  <svg
                    className="h-5 w-5 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>

              {/* Option 2: Sign in with Google (zkLogin) */}
              <button
                onClick={handleZkLogin}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-left transition-all hover:border-blue-500/50 hover:bg-zinc-800"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">Sign in with Google</h3>
                    <p className="text-sm text-zinc-400">
                      No wallet needed - sign in with your Google account
                    </p>
                  </div>
                  <svg
                    className="h-5 w-5 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="mt-6 border-t border-zinc-800 pt-4">
              <p className="text-xs text-zinc-500">
                By connecting, you agree to ODX's Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      ) : null;

  return (
    <>
      {mounted && createPortal(
        modalContent,
        document.body
      )}

      {/* Wallet-kit modal - only render when mounted and showWalletModal is true */}
      {mounted && showWalletModal && (
        <div className="wallet-kit-modal-wrapper">
          <ConnectModal
            open={showWalletModal}
            onOpenChange={(open) => {
              setShowWalletModal(open);
              // If wallet modal is closed, don't close the parent modal
              // The parent modal is already closed when wallet modal opens
            }}
          />
        </div>
      )}
    </>
  );
}

