import useSWR from 'swr';
import { PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { EnhancedRoyaltiesSDK } from '@/lib/solana/sdk';
import { useConnection } from '@solana/wallet-adapter-react';
import { useNetwork } from '@/context/NetworkContext';

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
  const { connection } = useConnection();
  const { network, rpcEndpoint } = useNetwork();

  const { data, isLoading, mutate } = useSWR(
    storagePDA ? ['token-dist-records', storagePDA.toBase58(), network] : null,
    async () => {
      if (!storagePDA) return [];

      const sdk = new EnhancedRoyaltiesSDK(rpcEndpoint);

      // Fetch all TokenDistributionRecord PDAs whose shareStorage == storagePDA
      // Layout: [8 discriminator][32 shareStorage][32 mint][8 totalDistributed][8 lastDistributedAt]
      // connection comes from wallet adapter's ConnectionProvider (tracks selected network)
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
