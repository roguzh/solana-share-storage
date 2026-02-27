import useSWR from 'swr';
import { PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { EnhancedRoyaltiesSDK } from '@/lib/solana/sdk';
import { DEFAULT_NETWORK, NETWORKS } from '@/config/networks';
import { getConnection } from '@/lib/solana/connection';

export interface TokenDistributionRecord {
  mint: PublicKey;
  shareStorage: PublicKey;
  totalDistributed: number;
  lastDistributedAt: number;
  decimals: number;
}

/**
 * Fetches ALL TokenDistributionRecord accounts for a given storage PDA.
 * Uses a memcmp filter on the shareStorage field so we get every mint that
 * has ever been distributed — regardless of the current ATA balance.
 */
export function useTokenDistributionRecords(storagePDA: PublicKey | null) {
  const { data, isLoading, mutate } = useSWR(
    storagePDA ? ['token-dist-records', storagePDA.toBase58()] : null,
    async () => {
      if (!storagePDA) return [];

      const sdk = new EnhancedRoyaltiesSDK(NETWORKS[DEFAULT_NETWORK].rpcEndpoint);
      const connection = getConnection();

      // Fetch all TokenDistributionRecord PDAs whose shareStorage == storagePDA
      // Layout: [8 discriminator][32 shareStorage][32 mint][8 totalDistributed][8 lastDistributedAt]
      const allRecords = await sdk.program.account.tokenDistributionRecord.all([
        {
          memcmp: {
            offset: 8, // skip 8-byte Anchor discriminator
            bytes: storagePDA.toBase58(),
          },
        },
      ]);

      const records: TokenDistributionRecord[] = [];

      for (const { account } of allRecords) {
        const mint = account.mint as PublicKey;
        let decimals = 0;

        try {
          const mintInfo = await getMint(connection, mint);
          decimals = mintInfo.decimals;
        } catch {
          // fallback: leave decimals as 0 if mint info unavailable
        }

        records.push({
          mint,
          shareStorage: account.shareStorage as PublicKey,
          totalDistributed: (account.totalDistributed as any).toNumber(),
          lastDistributedAt: (account.lastDistributedAt as any).toNumber(),
          decimals,
        });
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
