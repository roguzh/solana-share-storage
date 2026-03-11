import useSWR from 'swr';
import { PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import { useNetwork } from '@/context/NetworkContext';

export function useBalance(address: PublicKey | null) {
  const { connection } = useConnection();
  const { network } = useNetwork();

  const { data, error, isLoading, mutate } = useSWR(
    address ? ['balance', address.toBase58(), network] : null,
    async ([_, addressStr]) => {
      const pubkey = new PublicKey(addressStr);
      // Single call returns balance + data length (needed for rent calc)
      const accountInfo = await connection.getAccountInfo(pubkey);
      const balance = accountInfo?.lamports ?? 0;
      const dataLen = accountInfo?.data.length ?? 0;
      const rentExemptMin = await connection.getMinimumBalanceForRentExemption(dataLen);
      const distributable = Math.max(0, balance - rentExemptMin);
      return { balance, distributable };
    },
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
    }
  );

  return {
    balance: data?.balance ?? 0,
    distributableBalance: data?.distributable ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}
