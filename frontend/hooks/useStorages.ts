import useSWR from 'swr';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { EnhancedRoyaltiesSDK } from '@/lib/solana/sdk';
import { DEFAULT_NETWORK, NETWORKS } from '@/config/networks';
import type { StorageWithPDA } from '@/types/program';

export function useStorages() {
  const { publicKey } = useWallet();

  const { data, error, isLoading, mutate } = useSWR(
    publicKey ? ['storages', publicKey.toBase58()] : null,
    async () => {
      if (!publicKey) return [];

      const sdk = new EnhancedRoyaltiesSDK(NETWORKS[DEFAULT_NETWORK].rpcEndpoint);
      const accounts = await sdk.getShareStoragesByAdmin(publicKey);

      return accounts.map((acc: any) => ({
        ...acc.account,
        pda: acc.publicKey,
      })) as StorageWithPDA[];
    },
    {
      // Refresh every 30 seconds in background
      refreshInterval: 30000,
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Dedupe requests within 10s
      dedupingInterval: 10000,
    }
  );

  return {
    storages: data || [],
    isLoading,
    isError: error,
    mutate, // For manual revalidation after mutations
  };
}
