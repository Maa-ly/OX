'use client';

import '@suiet/wallet-kit/style.css';
import { WalletProvider } from '@suiet/wallet-kit';
import { useEffect, useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Prevent SSR hydration issues with WalletProvider
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render WalletProvider during SSR
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  );
}

