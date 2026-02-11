'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTransaction } from '@/hooks/useTransaction';
import { useEnhancedRoyaltiesSDK } from '@/hooks/useEnhancedRoyaltiesSDK';
import { Power } from 'lucide-react';

interface EnableToggleProps {
  storageName: string;
  enabled: boolean;
  isAdmin: boolean;
  onSuccess: () => void;
}

export function EnableToggle({
  storageName,
  enabled,
  isAdmin,
  onSuccess,
}: EnableToggleProps) {
  const { publicKey } = useWallet();
  const sdk = useEnhancedRoyaltiesSDK();
  const { executeTransaction } = useTransaction();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (!isAdmin || !publicKey || !sdk || isToggling) return;

    setIsToggling(true);

    try {
      const [shareStoragePda] = sdk.deriveShareStoragePDA(publicKey, storageName);

      const tx = enabled
        ? await sdk.disableShareStorageTransaction({
            shareStorageName: storageName,
            shareStoragePda,
            admin: publicKey,
          })
        : await sdk.enableShareStorageTransaction({
            shareStorageName: storageName,
            shareStoragePda,
            admin: publicKey,
          });

      await executeTransaction(
        tx,
        () => {
          onSuccess();
        },
        [['storage-detail', storageName, publicKey.toBase58()]]
      );
    } catch (err: any) {
      console.error('Error toggling storage:', err);
    } finally {
      setIsToggling(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        ${
          enabled
            ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
        }
      `}
      title={enabled ? 'Disable storage' : 'Enable storage'}
    >
      <Power size={16} className={isToggling ? 'animate-spin' : ''} />
      {isToggling ? 'Processing...' : enabled ? 'Disable' : 'Enable'}
    </button>
  );
}
