import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@suiet/wallet-kit';
import { useAuthStore } from '../stores/auth-store';

export function useWalletAuth() {
  const wallet = useWallet();
  const router = useRouter();
  const { setWalletAuth, clearWalletAuth, walletConnected: storeConnected, walletAddress: storeAddress } = useAuthStore();

  useEffect(() => {
    // Check if wallet has an account address (more reliable than wallet.connected)
    const hasWalletAccount = wallet.account?.address;
    const walletAddress = hasWalletAccount || null;
    
    if (walletAddress) {
      // Wallet has an address - sync with store
      const isNewConnection = !storeConnected || storeAddress !== walletAddress;
      
      if (isNewConnection) {
        setWalletAuth(walletAddress);
        
        // Only redirect on initial connection, not on page refresh
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          
          // Only redirect from home page on new connection, not on refresh
          if (currentPath === '/') {
            setTimeout(() => {
              router.push('/dashboard');
            }, 300);
          }
        }
      }
    } else if (storeConnected && !hasWalletAccount && !wallet.connected) {
      // Store has connection but wallet-kit doesn't - wait a bit before clearing
      // This handles the case where wallet-kit is slow to reconnect
      const timeoutId = setTimeout(() => {
        if (!wallet.account?.address && !wallet.connected) {
          clearWalletAuth();
        }
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [wallet.connected, wallet.account?.address, setWalletAuth, clearWalletAuth, storeConnected, storeAddress, router]);

  useEffect(() => {
    // Check if wallet actually has an account (more reliable than wallet.connected)
    const hasWalletAccount = !!wallet.account?.address;
    const walletAddressFromKit = wallet.account?.address;
    
    if (storeConnected && storeAddress && !hasWalletAccount && !wallet.connected) {
      // Store has wallet connection but wallet-kit doesn't show it
      // Check if addresses match (maybe wallet-kit just hasn't updated connected flag)
      if (walletAddressFromKit === storeAddress) {
        // Addresses match - wallet is actually connected, just flag is wrong
        // Don't log or clear - wallet is working
        return;
      }
      
      // Store has connection but wallet-kit doesn't
      // This can happen on page refresh - wallet-kit will reconnect automatically
      // Only log once per address change to reduce console spam
      const logKey = `wallet-reconnect-log-${storeAddress}`;
      const lastLogTime = sessionStorage.getItem(logKey);
      const now = Date.now();
      
      if (!lastLogTime || now - parseInt(lastLogTime) > 5000) {
        console.log('[useWalletAuth] Store has connection but wallet-kit not connected yet. Waiting for reconnection...', {
          storeAddress,
          walletConnected: wallet.connected,
          hasWalletAccount,
          walletAddressFromKit,
        });
        sessionStorage.setItem(logKey, now.toString());
      }

      // Set a timeout to clear stale connection if wallet-kit doesn't reconnect within 10 seconds
      const timeoutId = setTimeout(() => {
        if (!wallet.account?.address && !wallet.connected) {
          console.warn('[useWalletAuth] Wallet-kit did not reconnect after 10 seconds. Clearing stale connection from store.');
          clearWalletAuth();
          sessionStorage.removeItem(logKey);
        }
      }, 10000);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [storeConnected, storeAddress, wallet.connected, wallet.account?.address, clearWalletAuth]);

  // Determine if wallet is actually connected
  // Check account address first (more reliable than wallet.connected flag)
  const hasWalletAccount = !!wallet.account?.address;
  const actualConnected = hasWalletAccount || wallet.connected || storeConnected;
  const actualAddress = wallet.account?.address || storeAddress;

  return {
    wallet,
    isConnected: actualConnected,
    address: actualAddress,
  };
}

