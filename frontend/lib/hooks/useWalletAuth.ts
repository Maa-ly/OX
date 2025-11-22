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
      
      // Only redirect if this is a NEW connection (not a refresh)
      const isNewConnection = !storeConnected || storeAddress !== address;
      
      if (isNewConnection) {
        setWalletAuth(address);
        
        // Only redirect on initial connection, not on page refresh
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const isOnDashboard = currentPath.includes('/dashboard');
          const isOnProtectedRoute = currentPath.includes('/contribute') || 
                                     currentPath.includes('/portfolio') ||
                                     currentPath.includes('/markets') ||
                                     currentPath.includes('/discover') ||
                                     currentPath.includes('/trade') ||
                                     currentPath.includes('/predictions') ||
                                     currentPath.includes('/marketplace');
          
          // Only redirect from home page on new connection, not on refresh
          if (currentPath === '/') {
            setTimeout(() => {
              router.push('/dashboard');
            }, 300);
          }
          // Don't redirect if user is already on a valid page
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
      // Only log once per address change to reduce console spam
      const logKey = `wallet-reconnect-log-${storeAddress}`;
      const lastLogTime = sessionStorage.getItem(logKey);
      const now = Date.now();
      
      if (!lastLogTime || now - parseInt(lastLogTime) > 5000) {
        console.log('[useWalletAuth] Store has connection but wallet-kit not connected yet. Waiting for reconnection...', {
          storeAddress,
          walletConnected: wallet.connected,
        });
        sessionStorage.setItem(logKey, now.toString());
      }

      // Set a timeout to clear stale connection if wallet-kit doesn't reconnect within 10 seconds
      const timeoutId = setTimeout(() => {
        if (!wallet.connected) {
          console.warn('[useWalletAuth] Wallet-kit did not reconnect after 10 seconds. Clearing stale connection from store.');
          clearWalletAuth();
          sessionStorage.removeItem(logKey);
        }
      }, 10000);

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

