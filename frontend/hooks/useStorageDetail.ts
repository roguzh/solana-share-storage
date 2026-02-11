import useSWR from 'swr';
import { PublicKey } from '@solana/web3.js';
import { EnhancedRoyaltiesSDK } from '@/lib/solana/sdk';
import { DEFAULT_NETWORK, NETWORKS } from '@/config/networks';

export function useStorageDetail(storageName: string | null, admin: PublicKey | null) {
  const { data, error, isLoading, mutate } = useSWR(
    admin && storageName ? ['storage-detail', storageName, admin.toBase58()] : null,
    async () => {
      if (!admin || !storageName) return null;

      const sdk = new EnhancedRoyaltiesSDK(NETWORKS[DEFAULT_NETWORK].rpcEndpoint);
      const storage = await sdk.getShareStorage({ shareStorageName: storageName, admin });
      const [pda] = sdk.deriveShareStoragePDA(admin, storageName);

      return {
        ...storage,
        pda,
      };
    },
    {
      refreshInterval: 15000,
      keepPreviousData: true,
    }
  );

  return {
    storage: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}
