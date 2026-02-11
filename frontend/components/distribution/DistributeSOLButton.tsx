'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useTransaction } from '@/hooks/useTransaction';
import { useEnhancedRoyaltiesSDK } from '@/hooks/useEnhancedRoyaltiesSDK';
import { useBalance } from '@/hooks/useBalance';
import { formatSOL, formatAddress, formatBasisPoints } from '@/lib/utils/format';
import { Send, AlertCircle, Check } from 'lucide-react';
import type { ShareHolder } from '@/types/program';

interface DistributeSOLButtonProps {
  storageName: string;
  storagePDA: PublicKey;
  holders: ShareHolder[];
  enabled: boolean;
  onSuccess: () => void;
}

export function DistributeSOLButton({
  storageName,
  storagePDA,
  holders,
  enabled,
  onSuccess,
}: DistributeSOLButtonProps) {
  const { publicKey } = useWallet();
  const sdk = useEnhancedRoyaltiesSDK();
  const { executeTransaction } = useTransaction();
  const { balance, refresh: refreshBalance } = useBalance(storagePDA);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate rent-exempt minimum (approximately 0.00203928 SOL for ShareStorage account)
  const RENT_EXEMPT_MINIMUM = 0.00203928 * LAMPORTS_PER_SOL;
  const distributableBalance = Math.max(0, balance - RENT_EXEMPT_MINIMUM);
  const hasBalance = distributableBalance > 0;

  const canDistribute = enabled && holders.length > 0 && hasBalance && publicKey && sdk;

  const calculateDistribution = () => {
    if (distributableBalance <= 0) return [];

    return holders.map((holder) => {
      const amount = Math.floor((distributableBalance * holder.shareBasisPoints) / 10000);
      return {
        address: holder.pubkey.toBase58(),
        percentage: formatBasisPoints(holder.shareBasisPoints),
        amount: formatSOL(amount),
        lamports: amount,
      };
    });
  };

  const handleDistribute = async () => {
    if (!canDistribute) return;

    setError(null);
    setIsDistributing(true);

    try {
      const tx = await sdk!.distributeFundsTransaction({
        shareStorageName: storageName,
        admin: publicKey!,
      });

      await executeTransaction(
        tx,
        () => {
          refreshBalance();
          onSuccess();
          setShowConfirmModal(false);
        },
        [['storage-detail', storageName, publicKey!.toBase58()]]
      );
    } catch (err: any) {
      console.error('Error distributing SOL:', err);
      setError(err.message || 'Failed to distribute funds');
    } finally {
      setIsDistributing(false);
    }
  };

  const distribution = calculateDistribution();

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirmModal(true);
  };

  return (
    <>
      <Button
        onClick={handleOpenModal}
        disabled={!canDistribute}
        fullWidth
      >
        <Send size={18} />
        Distribute SOL
      </Button>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => !isDistributing && setShowConfirmModal(false)}
        title="Confirm SOL Distribution"
      >
        <div className="space-y-6">
          {/* Balance Summary */}
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Balance</span>
                <span className="font-semibold">{formatSOL(balance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rent Reserve</span>
                <span className="font-semibold text-orange-600">
                  -{formatSOL(RENT_EXEMPT_MINIMUM)}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Distributable</span>
                <span className="font-bold text-primary text-base">
                  {formatSOL(distributableBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Distribution Preview */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Distribution Preview</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {distribution.map((dist, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-mono text-xs text-gray-600">
                      {formatAddress(dist.address, 6)}
                    </p>
                    <p className="text-xs text-gray-500">{dist.percentage}</p>
                  </div>
                  <p className="font-semibold text-primary">{dist.amount}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Warning/Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Distribution Details</p>
                <ul className="space-y-1 text-xs">
                  <li>• Funds will be distributed proportionally to all holders</li>
                  <li>• Rent-exempt balance will be preserved in the storage account</li>
                  <li>• This transaction cannot be reversed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowConfirmModal(false)}
              disabled={isDistributing}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={handleDistribute}
              loading={isDistributing}
              disabled={isDistributing}
              fullWidth
            >
              <Check size={18} />
              Confirm Distribution
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
