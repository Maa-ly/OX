import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getZkLoginService, ZkLoginService } from "../auth/zklogin";
import { useAuthStore } from "../stores/auth-store";

export interface UseZkLoginReturn {
  isAuthenticated: boolean;
  address: string | null;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
  zkLoginService: ZkLoginService | null;
}

export function useZkLogin(): UseZkLoginReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zkLoginService, setZkLoginService] = useState<ZkLoginService | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setZkLoginAuth, clearZkLoginAuth, zkLoginAuthenticated: storeAuth, zkLoginAddress: storeAddress } = useAuthStore();

  // Initialize service and sync with store
  useEffect(() => {
    const service = getZkLoginService();
    setZkLoginService(service);
    
    // Check if we have an address from service
    const currentAddress = service.getAddress();
    if (currentAddress && service.isAuthenticated()) {
      setAddress(currentAddress);
      setIsAuthenticated(true);
      // Sync with store
      setZkLoginAuth(currentAddress);
    } else if (storeAddress && storeAuth) {
      // Restore from store if service doesn't have it
      setAddress(storeAddress);
      setIsAuthenticated(true);
    }
    
    setIsLoading(false);
  }, [setZkLoginAuth, storeAddress, storeAuth]);

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const idToken = searchParams.get("id_token");
      if (idToken && zkLoginService) {
        setIsLoading(true);
        setError(null);
        
        try {
          const address = await zkLoginService.completeAuthFlow(idToken);
          setAddress(address);
          setIsAuthenticated(true);
          
          // Update store
          setZkLoginAuth(address);
          
          // Remove id_token from URL
          const newUrl = window.location.pathname;
          router.replace(newUrl);
          
          // Redirect to dashboard after successful auth
          setTimeout(() => {
            router.push('/dashboard');
          }, 100);
        } catch (err: any) {
          setError(err.message || "Failed to complete authentication");
          console.error("Auth error:", err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (zkLoginService) {
      handleCallback();
    }
  }, [searchParams, zkLoginService, router]);

  const signIn = useCallback(async () => {
    if (!zkLoginService) {
      setError("zkLogin service not initialized");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await zkLoginService.initiateGoogleSignIn();
      // User will be redirected to Google, so we don't need to do anything else
    } catch (err: any) {
      setError(err.message || "Failed to initiate sign in");
      setIsLoading(false);
    }
  }, [zkLoginService]);

  const signOut = useCallback(() => {
    if (zkLoginService) {
      zkLoginService.clearState();
      clearZkLoginAuth();
      setAddress(null);
      setIsAuthenticated(false);
      setError(null);
    }
  }, [zkLoginService, clearZkLoginAuth]);

  return {
    isAuthenticated,
    address,
    isLoading,
    error,
    signIn,
    signOut,
    zkLoginService,
  };
}

