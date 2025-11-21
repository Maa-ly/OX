'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useState } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!mounted || !open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className={`relative z-[9999] w-full ${sizeClasses[size]} my-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors"
              aria-label="Close modal"
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
          )}
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

interface ErrorModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  details?: string;
  actionLabel?: string;
  onAction?: () => void;
  balanceInfo?: {
    current: string;
    required: string;
    shortfall: string;
  };
}

export function ErrorModal({
  open,
  onClose,
  title = 'Error',
  message,
  details,
  actionLabel,
  onAction,
  balanceInfo,
}: ErrorModalProps) {
  // Parse WAL token errors and make them user-friendly
  const isWALError = message.toLowerCase().includes('wal') || 
                     message.toLowerCase().includes('walrus token') ||
                     message.toLowerCase().includes('insufficient') ||
                     message.toLowerCase().includes('not enough coins') ||
                     message.includes('0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL');

  const friendlyMessage = isWALError
    ? 'Insufficient WAL Tokens'
    : title;

  const friendlyDetails = isWALError
    ? 'You need WAL tokens to store data on Walrus. Please exchange SUI for WAL tokens first. You can get WAL tokens from the Walrus faucet or testnet exchange.'
    : details || message;

  return (
    <Modal open={open} onClose={onClose} title={friendlyMessage} size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <svg
                className="h-6 w-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-white">{friendlyDetails}</p>
            {!isWALError && details && (
              <p className="mt-2 text-sm text-zinc-400 font-mono break-all">
                {message}
              </p>
            )}
          </div>
        </div>

        {isWALError && (
          <div className="mt-4 space-y-3">
            {balanceInfo && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm font-semibold text-red-300 mb-2">Balance Details:</p>
                <div className="space-y-1 text-sm text-red-200">
                  <div className="flex justify-between">
                    <span>Your Balance:</span>
                    <span className="font-mono">{balanceInfo.current}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Required:</span>
                    <span className="font-mono">{balanceInfo.required}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-red-500/20">
                    <span className="font-semibold">Shortfall:</span>
                    <span className="font-mono font-semibold">{balanceInfo.shortfall}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-300">
                <strong>How to get WAL tokens:</strong>
              </p>
              <ul className="mt-2 text-sm text-blue-200 space-y-1 list-disc list-inside">
                <li>Visit the Walrus testnet faucet</li>
                <li>Exchange SUI for WAL tokens on testnet</li>
                <li>Ensure your wallet has sufficient WAL balance</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4 border-t border-zinc-800">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
            >
              {actionLabel}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SuccessModal({
  open,
  onClose,
  title = 'Success',
  message,
  actionLabel,
  onAction,
}: SuccessModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <svg
                className="h-6 w-6 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-white">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-zinc-800">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
            >
              {actionLabel}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

