import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuthType = 'wallet' | 'zklogin' | null;

interface AuthState {
  // Auth state
  isAuthenticated: boolean;
  authType: AuthType;
  address: string | null;
  
  // Wallet-kit state
  walletConnected: boolean;
  walletAddress: string | null;
  
  // zkLogin state
  zkLoginAuthenticated: boolean;
  zkLoginAddress: string | null;
  
  // Actions
  setWalletAuth: (address: string) => void;
  setZkLoginAuth: (address: string) => void;
  clearWalletAuth: () => void;
  clearZkLoginAuth: () => void;
  clearAllAuth: () => void;
  
  // Computed getters
  getCurrentAddress: () => string | null;
  getCurrentAuthType: () => AuthType;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      authType: null,
      address: null,
      walletConnected: false,
      walletAddress: null,
      zkLoginAuthenticated: false,
      zkLoginAddress: null,

      // Set wallet authentication
      setWalletAuth: (address: string) => {
        set({
          walletConnected: true,
          walletAddress: address,
          isAuthenticated: true,
          authType: 'wallet',
          address: address,
        });
      },

      // Set zkLogin authentication
      setZkLoginAuth: (address: string) => {
        set({
          zkLoginAuthenticated: true,
          zkLoginAddress: address,
          isAuthenticated: true,
          authType: 'zklogin',
          address: address,
        });
      },

      // Clear wallet authentication
      clearWalletAuth: () => {
        set({
          walletConnected: false,
          walletAddress: null,
          // Only clear main auth if wallet was the active auth
          ...(get().authType === 'wallet' ? {
            isAuthenticated: false,
            authType: null,
            address: null,
          } : {}),
        });
      },

      // Clear zkLogin authentication
      clearZkLoginAuth: () => {
        set({
          zkLoginAuthenticated: false,
          zkLoginAddress: null,
          // Only clear main auth if zkLogin was the active auth
          ...(get().authType === 'zklogin' ? {
            isAuthenticated: false,
            authType: null,
            address: null,
          } : {}),
        });
      },

      // Clear all authentication
      clearAllAuth: () => {
        set({
          isAuthenticated: false,
          authType: null,
          address: null,
          walletConnected: false,
          walletAddress: null,
          zkLoginAuthenticated: false,
          zkLoginAddress: null,
        });
      },

      // Get current address (prioritizes wallet over zkLogin)
      getCurrentAddress: () => {
        const state = get();
        return state.walletAddress || state.zkLoginAddress || null;
      },

      // Get current auth type
      getCurrentAuthType: () => {
        const state = get();
        if (state.walletConnected) return 'wallet';
        if (state.zkLoginAuthenticated) return 'zklogin';
        return null;
      },
    }),
    {
      name: 'odx-auth-storage', // localStorage key
      // Only persist essential data
      partialize: (state) => ({
        walletConnected: state.walletConnected,
        walletAddress: state.walletAddress,
        zkLoginAuthenticated: state.zkLoginAuthenticated,
        zkLoginAddress: state.zkLoginAddress,
        isAuthenticated: state.isAuthenticated,
        authType: state.authType,
        address: state.address,
      }),
    }
  )
);

