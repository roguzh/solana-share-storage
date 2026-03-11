import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import bs58 from 'bs58';

export function useAuth() {
  const { publicKey, signMessage, connected } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  // Track the last checked wallet to prevent loops
  const lastCheckedWallet = useRef<string | null>(null);

  // Check session and verify wallet matches
  useEffect(() => {
    const walletAddress = publicKey?.toBase58() ?? null;
    
    // Skip if we already checked this wallet (prevents loops)
    if (walletAddress === lastCheckedWallet.current) {
      return;
    }
    
    lastCheckedWallet.current = walletAddress;

    const checkSession = async () => {
      setIsChecking(true);
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        
        // Verify session wallet matches connected wallet
        if (data.authenticated && data.publicKey === walletAddress) {
          setIsAuthenticated(true);
        } else if (data.authenticated && walletAddress && data.publicKey !== walletAddress) {
          // Session exists but for different wallet - clear it
          await fetch('/api/auth/session', { method: 'DELETE' });
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, [publicKey]);

  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      // Step 1: Get challenge
      const challengeRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: publicKey.toBase58() }),
      });

      if (!challengeRes.ok) {
        throw new Error('Failed to get challenge');
      }

      const { message, nonce } = await challengeRes.json();

      // Step 2: Sign message
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      // Step 3: Verify signature
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: publicKey.toBase58(),
          signature,
          nonce,
        }),
      });

      if (!verifyRes.ok) {
        throw new Error('Signature verification failed');
      }

      // Mark this wallet as checked to prevent session check from overriding
      lastCheckedWallet.current = publicKey.toBase58();
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, signMessage]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  // Auto-logout if wallet disconnects (connected is false and was authenticated)
  useEffect(() => {
    if (!connected) {
      setIsAuthenticated(false);
      lastCheckedWallet.current = null; // Reset so next connect will check
    }
  }, [connected]);

  return {
    isAuthenticated,
    isLoading,
    isChecking,
    authenticate,
    logout,
    publicKey: publicKey?.toBase58(),
  };
}
