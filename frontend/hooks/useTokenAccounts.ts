import useSWR from 'swr';
import { PublicKey } from '@solana/web3.js';
import { getAccount, getMint } from '@solana/spl-token';
import { getConnection } from '@/lib/solana/connection';

export interface TokenAccountInfo {
  mint: PublicKey;
  balance: bigint;
  decimals: number;
  symbol?: string;
}

export function useTokenAccounts(owner: PublicKey | null) {
  const { data, error, isLoading, mutate } = useSWR(
    owner ? ['token-accounts', owner.toBase58()] : null,
    async ([_, ownerStr]) => {
      const connection = getConnection();
      const ownerPubkey = new PublicKey(ownerStr);

      // Get all token accounts for the owner
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerPubkey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      });

      const accounts: TokenAccountInfo[] = [];

      for (const { account } of tokenAccounts.value) {
        const parsedInfo = account.data.parsed.info;
        const mint = new PublicKey(parsedInfo.mint);
        const balance = BigInt(parsedInfo.tokenAmount.amount);

        // Only include accounts with non-zero balance
        if (balance > BigInt(0)) {
          try {
            const mintInfo = await getMint(connection, mint);
            accounts.push({
              mint,
              balance,
              decimals: mintInfo.decimals,
            });
          } catch (err) {
            console.error('Error fetching mint info:', err);
          }
        }
      }

      return accounts;
    },
    {
      refreshInterval: 20000, // Refresh every 20 seconds
      revalidateOnFocus: true,
    }
  );

  return {
    tokenAccounts: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
