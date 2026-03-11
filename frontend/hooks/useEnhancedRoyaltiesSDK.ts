import { useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { EnhancedRoyaltiesSDK } from '@/lib/solana/sdk';
import { useNetwork } from '@/context/NetworkContext';

export function useEnhancedRoyaltiesSDK() {
  const { publicKey } = useWallet();
  const { rpcEndpoint } = useNetwork();

  const sdk = useMemo(() => {
    if (!publicKey) return null;
    return new EnhancedRoyaltiesSDK(rpcEndpoint);
  }, [publicKey, rpcEndpoint]);

  return sdk;
}
