import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@suiet/wallet-kit';
import { useAuthStore } from '../stores/auth-store';

export function useWalletAuth() {
  const wallet = useWallet();
  const router = useRouter();
  const { setWalletAuth, clearWalletAuth, walletConnected: storeConnected, walletAddress: storeAddress } = useAuthStore();

  useEffect(() => {
    if (wallet.connected && wallet.account?.address) {
      const address = wallet.account.address;
      
      if (!storeConnected || storeAddress !== address) {
        setWalletAuth(address);
        
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const isOnDashboard = currentPath.includes('/dashboard');
          const isOnProtectedRoute = currentPath.includes('/contribute') || 
                                     currentPath.includes('/portfolio') ||
                                     currentPath.includes('/markets');
          
          if (!isOnDashboard && !isOnProtectedRoute && currentPath !== '/') {
            setTimeout(() => {
              router.push('/dashboard');
            }, 300);
          } else if (currentPath === '/') {
            setTimeout(() => {
              router.push('/dashboard');
            }, 300);
          }
        }
      }
    } else if (storeConnected && !wallet.connected) {
      clearWalletAuth();
    }
  }, [wallet.connected, wallet.account?.address, setWalletAuth, clearWalletAuth, storeConnected, storeAddress, router]);

  useEffect(() => {
    if (storeConnected && storeAddress && !wallet.connected) {
      // Store has wallet connection but wallet-kit doesn't
      // This can happen on page refresh - wallet-kit will reconnect automatically
      console.log('[useWalletAuth] Store has connection but wallet-kit not connected yet. Waiting for reconnection...', {
        storeAddress,
        walletConnected: wallet.connected,
      });

      // Set a timeout to clear stale connection if wallet-kit doesn't reconnect within 5 seconds
      const timeoutId = setTimeout(() => {
        if (!wallet.connected) {
          console.warn('[useWalletAuth] Wallet-kit did not reconnect after 5 seconds. Clearing stale connection from store.');
          clearWalletAuth();
        }
      }, 5000);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [storeConnected, storeAddress, wallet.connected, clearWalletAuth]);

  return {
    wallet,
    isConnected: wallet.connected || storeConnected,
    address: wallet.account?.address || storeAddress,
  };
}

