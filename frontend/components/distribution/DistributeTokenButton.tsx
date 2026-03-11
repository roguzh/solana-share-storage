'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useTransaction } from '@/hooks/useTransaction';
import { useEnhancedRoyaltiesSDK } from '@/hooks/useEnhancedRoyaltiesSDK';
import { useTokenAccounts } from '@/hooks/useTokenAccounts';
import { formatTokenAmount, formatAddress, formatBasisPoints } from '@/lib/utils/format';
import { Coins, AlertCircle, Check, ChevronDown } from 'lucide-react';
import type { ShareHolder } from '@/types/program';
import type { TokenAccountInfo } from '@/hooks/useTokenAccounts';

interface DistributeTokenButtonProps {
  storageName: string;
  storagePDA: PublicKey;
  holders: ShareHolder[];
  enabled: boolean;
  onSuccess: () => void;
}

export function DistributeTokenButton({
  storageName,
  storagePDA,
  holders,
  enabled,
  onSuccess,
}: DistributeTokenButtonProps) {
  const { publicKey } = useWallet();
  const sdk = useEnhancedRoyaltiesSDK();
  const { executeTransaction } = useTransaction();
  const { tokenAccounts, isLoading: isLoadingTokens } = useTokenAccounts(storagePDA);

  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenAccountInfo | null>(null);
  const [isDistributing, setIsDistributing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDistribute = enabled && holders.length > 0 && publicKey && sdk;
  const hasTokens = tokenAccounts.length > 0;

  const calculateDistribution = (token: TokenAccountInfo) => {
    const totalBalance = Number(token.balance);

    return holders.map((holder) => {
      const amount = Math.floor((totalBalance * holder.shareBasisPoints) / 10000);
      return {
        address: holder.pubkey.toBase58(),
        percentage: formatBasisPoints(holder.shareBasisPoints),
        amount: formatTokenAmount(BigInt(amount), token.decimals),
        rawAmount: amount,
      };
    });
  };

  const handleSelectToken = (token: TokenAccountInfo) => {
    setSelectedToken(token);
    setShowSelectModal(false);
    setShowConfirmModal(true);
  };

  const handleDistribute = async () => {
    if (!canDistribute || !selectedToken) return;

    setError(null);
    setIsDistributing(true);

    try {
      const tx = await sdk!.distributeTokensTransaction({
        shareStorageName: storageName,
        admin: publicKey!,
        tokenMint: selectedToken.mint,
      });

      await executeTransaction(
        tx,
        () => {
          onSuccess();
          setShowConfirmModal(false);
          setSelectedToken(null);
        },
        [['storage-detail', storageName, publicKey!.toBase58()]]
      );
    } catch (err: any) {
      console.error('Error distributing tokens:', err);
      setError(err.message || 'Failed to distribute tokens');
    } finally {
      setIsDistributing(false);
    }
  };

  const distribution = selectedToken ? calculateDistribution(selectedToken) : [];

  const handleOpenSelectModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSelectModal(true);
  };

  return (
    <>
      <Button
        onClick={handleOpenSelectModal}
        disabled={!canDistribute || !hasTokens}
        variant="secondary"
        fullWidth
      >
        <Coins size={18} />
        Distribute Tokens
        {isLoadingTokens && <span className="text-xs">(Loading...)</span>}
      </Button>

      {/* Token Selection Modal */}
      <Modal
        isOpen={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        title="Select Token"
      >
        <div className="space-y-4">
          {tokenAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No tokens found in this storage</p>
              <p className="text-sm mt-2">Send SPL tokens to the storage PDA to distribute them</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tokenAccounts.map((token, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectToken(token)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-primary-50 rounded-xl transition-colors group"
                >
                  <div className="text-left">
                    <p className="font-mono text-sm font-medium text-gray-900">
                      {formatAddress(token.mint.toBase58(), 6)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Balance: {formatTokenAmount(token.balance, token.decimals)}
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    className="text-gray-400 group-hover:text-primary rotate-[-90deg] transition-colors"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => !isDistributing && setShowConfirmModal(false)}
        title="Confirm Token Distribution"
      >
        {selectedToken && (
          <div className="space-y-6">
            {/* Token Info */}
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Token Mint
                  </p>
                  <p className="font-mono text-xs text-gray-900 break-all">
                    {selectedToken.mint.toBase58()}
                  </p>
                </div>
                <div className="h-px bg-gray-200" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Balance</span>
                  <span className="font-bold text-primary text-base">
                    {formatTokenAmount(selectedToken.balance, selectedToken.decimals)}
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

            {/* Warning */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Important Notes</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Tokens will be distributed proportionally to all holders</li>
                    <li>• Holders must have associated token accounts (ATAs) for this mint</li>
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
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedToken(null);
                }}
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
        )}
      </Modal>
    </>
  );
}
