import useSWR from 'swr';
import { PublicKey } from '@solana/web3.js';
import { EnhancedRoyaltiesSDK } from '@/lib/solana/sdk';
import { useNetwork } from '@/context/NetworkContext';

export function useStorageDetail(storageName: string | null, admin: PublicKey | null) {
  const { network, rpcEndpoint } = useNetwork();

  const { data, error, isLoading, mutate } = useSWR(
    admin && storageName ? ['storage-detail', storageName, admin.toBase58(), network] : null,
    async () => {
      if (!admin || !storageName) return null;

      const sdk = new EnhancedRoyaltiesSDK(rpcEndpoint);
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
