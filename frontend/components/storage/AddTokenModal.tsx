'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTransaction } from '@/hooks/useTransaction';
import { useEnhancedRoyaltiesSDK } from '@/hooks/useEnhancedRoyaltiesSDK';
import { isValidPublicKey } from '@/lib/utils/validation';
import { Copy, Check, Coins, AlertCircle } from 'lucide-react';
import { formatAddress } from '@/lib/utils/format';

interface AddTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageName: string;
  onSuccess: () => void;
}

export function AddTokenModal({ isOpen, onClose, storageName, onSuccess }: AddTokenModalProps) {
  const { publicKey } = useWallet();
  const sdk = useEnhancedRoyaltiesSDK();
  const { executeTransaction } = useTransaction();

  const [mintAddress, setMintAddress] = useState('');
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isValidMint = isValidPublicKey(mintAddress);

  const handleCreate = async () => {
    if (!isValidMint || !publicKey || !sdk) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const mintPubkey = new PublicKey(mintAddress);

      const tx = await sdk.createStorageTokenAccountTransaction({
        shareStorageName: storageName,
        admin: publicKey,
        tokenMint: mintPubkey,
        payer: publicKey,
      });

      // Get the ATA address to show user
      const ataAddress = await sdk.getStorageTokenAccount(publicKey, storageName, mintPubkey);

      await executeTransaction(tx, () => {
        setDepositAddress(ataAddress.toBase58());
        onSuccess();
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create token account';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!depositAddress) return;
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setMintAddress('');
      setDepositAddress(null);
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add SPL Token">
      <div className="space-y-5">
        {!depositAddress ? (
          <>
            <div className="bg-primary-50/60 border border-primary-100 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Coins className="text-primary flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-gray-700 leading-relaxed">
                  <p className="font-semibold mb-1">How it works</p>
                  <p>
                    This creates a token account owned by your storage PDA. Once created,
                    send SPL tokens to that address and then trigger distribution.
                  </p>
                </div>
              </div>
            </div>

            <Input
              label="Token Mint Address"
              value={mintAddress}
              onChange={(e) => setMintAddress(e.target.value)}
              placeholder="e.g. EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
              disabled={isSubmitting}
              helperText={mintAddress && !isValidMint ? 'Invalid mint address' : undefined}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleClose} disabled={isSubmitting} fullWidth>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!isValidMint || isSubmitting}
                loading={isSubmitting}
                fullWidth
              >
                Create Token Account
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="text-green-600" size={24} />
              </div>
              <p className="font-semibold text-green-800 mb-1">Token account created!</p>
              <p className="text-sm text-green-700">
                Send tokens to the address below to fund your storage.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Deposit Address
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
                <p className="font-mono text-xs text-gray-700 break-all">{depositAddress}</p>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 text-gray-400 hover:text-primary transition-colors"
                >
                  {copied ? (
                    <Check size={18} className="text-green-500" />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {formatAddress(depositAddress, 12)}
              </p>
            </div>

            <Button onClick={handleClose} fullWidth>
              Done
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
