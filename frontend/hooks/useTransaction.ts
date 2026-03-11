import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { useState } from "react";
import { useSWRConfig } from "swr";

export function useTransaction() {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { mutate } = useSWRConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const executeTransaction = async (
    transaction: Transaction,
    onSuccess?: () => void,
    mutateKeys?: string[][],
  ) => {
    if (!publicKey || !signTransaction) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    setError(null);
    setSignature(null);

    try {
      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("finalized");

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signedTransaction = await signTransaction(transaction);

      // Send and confirm transaction
      const sig = await connection.sendRawTransaction(
        signedTransaction.serialize(),
      );
      setSignature(sig);

      // Wait for confirmation
      await connection.confirmTransaction(
        {
          signature: sig,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed",
      );

      // Invalidate relevant SWR caches
      if (mutateKeys) {
        await Promise.all(mutateKeys.map((key) => mutate(key)));
      }

      onSuccess?.();
      return sig;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    executeTransaction,
    isLoading,
    error,
    signature,
  };
}
