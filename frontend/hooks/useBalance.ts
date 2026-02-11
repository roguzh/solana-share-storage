import useSWR from 'swr';
import { PublicKey, Connection } from '@solana/web3.js';
import { getConnection } from '@/lib/solana/connection';

export function useBalance(address: PublicKey | null) {
  const { data, error, isLoading, mutate } = useSWR(
    address ? ['balance', address.toBase58()] : null,
    async ([_, addressStr]) => {
      const connection = getConnection();
      const balance = await connection.getBalance(new PublicKey(addressStr));
      return balance;
    },
    {
      refreshInterval: 15000, // Refresh every 15 seconds
      revalidateOnFocus: true,
    }
  );

  return {
    balance: data ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}
