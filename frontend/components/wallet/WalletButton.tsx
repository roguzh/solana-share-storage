'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef, useState } from 'react';

export function WalletButton() {
  const { connected } = useWallet();
  const { isAuthenticated, authenticate, isLoading, isChecking } = useAuth();
  
  // Track if we've already attempted authentication for this session
  const hasAttemptedAuth = useRef(false);
  
  // Prevent hydration mismatch by only rendering wallet-dependent UI after mount
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-authenticate when wallet connects (only after session check completes)
  useEffect(() => {
    // Reset auth attempt tracker when wallet disconnects
    if (!connected) {
      hasAttemptedAuth.current = false;
      return;
    }
    
    // Wait for session check to complete before auto-authenticating
    if (connected && !isChecking && !isAuthenticated && !isLoading && !hasAttemptedAuth.current) {
      hasAttemptedAuth.current = true;
      authenticate().catch(console.error);
    }
  }, [connected, isAuthenticated, isLoading, isChecking, authenticate]);

  // Render placeholder during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {connected && !isChecking && !isAuthenticated && !isLoading && (
        <button
          onClick={() => authenticate()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Sign Message to Authenticate
        </button>
      )}
      {(isLoading || isChecking) && connected && (
        <span className="text-sm text-gray-600">
          {isChecking ? 'Checking session...' : 'Authenticating...'}
        </span>
      )}
      {isAuthenticated && (
        <span className="text-sm text-green-600 font-medium">✓ Authenticated</span>
      )}
      <WalletMultiButton />
    </div>
  );
}
