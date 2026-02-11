import { useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { EnhancedRoyaltiesSDK } from '@/lib/solana/sdk';
import { DEFAULT_NETWORK, NETWORKS } from '@/config/networks';

export function useEnhancedRoyaltiesSDK() {
  const { publicKey } = useWallet();

  const sdk = useMemo(() => {
    if (!publicKey) return null;
    return new EnhancedRoyaltiesSDK(NETWORKS[DEFAULT_NETWORK].rpcEndpoint);
  }, [publicKey]);

  return sdk;
}
