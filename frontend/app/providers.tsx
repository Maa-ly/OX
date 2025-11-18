'use client';

import '@suiet/wallet-kit/style.css';
import { WalletProvider } from '@suiet/wallet-kit';
import { useEffect, useState } from 'react';
import { useWalletAuth } from '@/lib/hooks/useWalletAuth';
import { FixEmptyImages } from '@/components/fix-empty-images';

function WalletAuthSync({ children }: { children: React.ReactNode }) {
  useWalletAuth(); // Sync wallet with auth store
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Prevent SSR hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <WalletProvider>
      <WalletAuthSync>
        <FixEmptyImages />
        {children}
      </WalletAuthSync>
    </WalletProvider>
  );
}

