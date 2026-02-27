import useSWR from 'swr';
import { PublicKey } from '@solana/web3.js';
import { EnhancedRoyaltiesSDK } from '@/lib/solana/sdk';
import { DEFAULT_NETWORK, NETWORKS } from '@/config/networks';
import type { TokenAccountInfo } from './useTokenAccounts';

export interface TokenDistributionRecord {
  mint: PublicKey;
  shareStorage: PublicKey;
  totalDistributed: number;
  lastDistributedAt: number;
}

export function useTokenDistributionRecords(
  storagePDA: PublicKey | null,
  admin: PublicKey | null,
  storageName: string | null,
  tokenAccounts: TokenAccountInfo[]
) {
  const { data, isLoading, mutate } = useSWR(
    storagePDA && admin && storageName && tokenAccounts.length > 0
      ? ['token-dist-records', storagePDA.toBase58(), tokenAccounts.map((t) => t.mint.toBase58()).join(',')]
      : null,
    async () => {
      if (!storagePDA || !admin || !storageName) return [];

      const sdk = new EnhancedRoyaltiesSDK(NETWORKS[DEFAULT_NETWORK].rpcEndpoint);
      const records: TokenDistributionRecord[] = [];

      for (const token of tokenAccounts) {
        const record = await sdk.getTokenDistributionRecord({
          shareStorageName: storageName,
          admin,
          tokenMint: token.mint,
        });
        if (record) {
          records.push({
            mint: token.mint,
            shareStorage: record.shareStorage,
            totalDistributed: record.totalDistributed.toNumber(),
            lastDistributedAt: record.lastDistributedAt.toNumber(),
          });
        }
      }

      return records;
    },
    { refreshInterval: 15000 }
  );

  return {
    records: data ?? [],
    isLoading,
    refresh: mutate,
  };
}
