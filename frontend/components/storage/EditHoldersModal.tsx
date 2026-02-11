'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTransaction } from '@/hooks/useTransaction';
import { useEnhancedRoyaltiesSDK } from '@/hooks/useEnhancedRoyaltiesSDK';
import { validateHolders, isValidPublicKey } from '@/lib/utils/validation';
import { formatBasisPoints } from '@/lib/utils/format';
import { Trash2, Plus, AlertCircle, Check } from 'lucide-react';
import type { ShareHolder } from '@/types/program';

interface HolderInput {
  pubkey: string;
  shareBasisPoints: string;
}

interface EditHoldersModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageName: string;
  currentHolders: ShareHolder[];
  onSuccess: () => void;
}

export function EditHoldersModal({
  isOpen,
  onClose,
  storageName,
  currentHolders,
  onSuccess,
}: EditHoldersModalProps) {
  const { publicKey } = useWallet();
  const sdk = useEnhancedRoyaltiesSDK();
  const { executeTransaction } = useTransaction();

  const [holders, setHolders] = useState<HolderInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize holders from current state
  useEffect(() => {
    if (isOpen && currentHolders.length > 0) {
      setHolders(
        currentHolders.map((h) => ({
          pubkey: h.pubkey.toBase58(),
          shareBasisPoints: h.shareBasisPoints.toString(),
        }))
      );
    } else if (isOpen && currentHolders.length === 0) {
      // Start with one empty holder
      setHolders([{ pubkey: '', shareBasisPoints: '' }]);
    }
  }, [isOpen, currentHolders]);

  const addHolder = () => {
    if (holders.length < 16) {
      setHolders([...holders, { pubkey: '', shareBasisPoints: '' }]);
    }
  };

  const removeHolder = (index: number) => {
    setHolders(holders.filter((_, i) => i !== index));
  };

  const updateHolder = (index: number, field: keyof HolderInput, value: string) => {
    const updated = [...holders];
    updated[index][field] = value;
    setHolders(updated);
  };

  const totalBasisPoints = holders.reduce((sum, h) => {
    const points = parseInt(h.shareBasisPoints) || 0;
    return sum + points;
  }, 0);

  const isValid = totalBasisPoints === 10000;

  const validateForm = (): string | null => {
    // Check if all fields are filled
    for (let i = 0; i < holders.length; i++) {
      if (!holders[i].pubkey.trim()) {
        return `Holder #${i + 1}: Wallet address is required`;
      }
      if (!holders[i].shareBasisPoints.trim()) {
        return `Holder #${i + 1}: Basis points are required`;
      }
    }

    // Validate public keys
    for (let i = 0; i < holders.length; i++) {
      if (!isValidPublicKey(holders[i].pubkey)) {
        return `Holder #${i + 1}: Invalid wallet address`;
      }
    }

    // Validate basis points
    for (let i = 0; i < holders.length; i++) {
      const points = parseInt(holders[i].shareBasisPoints);
      if (isNaN(points) || points <= 0) {
        return `Holder #${i + 1}: Basis points must be greater than 0`;
      }
    }

    // Check for duplicates
    const addresses = holders.map((h) => h.pubkey);
    const uniqueAddresses = new Set(addresses);
    if (addresses.length !== uniqueAddresses.size) {
      return 'Duplicate wallet addresses are not allowed';
    }

    // Check total basis points
    if (totalBasisPoints !== 10000) {
      return `Total basis points must equal 10,000 (currently ${totalBasisPoints.toLocaleString()})`;
    }

    return null;
  };

  const handleSubmit = async () => {
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!publicKey || !sdk) {
      setError('Wallet not connected');
      return;
    }

    setIsSubmitting(true);

    try {
      const holdersData = holders.map((h) => ({
        pubkey: new PublicKey(h.pubkey),
        shareBasisPoints: parseInt(h.shareBasisPoints),
      }));

      const tx = await sdk.setHoldersTransaction({
        shareStorageName: storageName,
        admin: publicKey,
        holders: holdersData,
      });

      await executeTransaction(
        tx,
        () => {
          onSuccess();
          onClose();
        },
        [['storage-detail', storageName, publicKey.toBase58()]]
      );
    } catch (err: any) {
      console.error('Error setting holders:', err);
      setError(err.message || 'Failed to update holders');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Holders">
      <div className="space-y-6">
        {/* Holders List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {holders.map((holder, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wide">
                  Holder #{index + 1}
                </span>
                {holders.length > 1 && (
                  <button
                    onClick={() => removeHolder(index)}
                    className="text-red-500 hover:text-red-600 transition-colors"
                    disabled={isSubmitting}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <Input
                label="Wallet Address"
                value={holder.pubkey}
                onChange={(e) => updateHolder(index, 'pubkey', e.target.value)}
                placeholder="Enter Solana wallet address"
                disabled={isSubmitting}
              />

              <Input
                label="Basis Points (10,000 = 100%)"
                type="number"
                value={holder.shareBasisPoints}
                onChange={(e) => updateHolder(index, 'shareBasisPoints', e.target.value)}
                placeholder="e.g., 7000 for 70%"
                disabled={isSubmitting}
                helperText={
                  holder.shareBasisPoints
                    ? `= ${formatBasisPoints(parseInt(holder.shareBasisPoints) || 0)}`
                    : undefined
                }
              />
            </div>
          ))}
        </div>

        {/* Add Holder Button */}
        {holders.length < 16 && (
          <Button
            variant="secondary"
            onClick={addHolder}
            disabled={isSubmitting}
            fullWidth
          >
            <Plus size={18} />
            Add Holder ({holders.length}/16)
          </Button>
        )}

        {/* Total Basis Points Indicator */}
        <div
          className={`p-4 rounded-xl border-2 ${
            isValid
              ? 'bg-green-50 border-green-200'
              : 'bg-orange-50 border-orange-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isValid ? (
                <Check className="text-green-600" size={20} />
              ) : (
                <AlertCircle className="text-orange-600" size={20} />
              )}
              <span className="font-semibold text-gray-900">Total Basis Points</span>
            </div>
            <span
              className={`text-lg font-bold ${
                isValid ? 'text-green-600' : 'text-orange-600'
              }`}
            >
              {totalBasisPoints.toLocaleString()} / 10,000
            </span>
          </div>
          {!isValid && (
            <p className="text-xs text-orange-700 mt-2">
              {totalBasisPoints < 10000
                ? `Add ${(10000 - totalBasisPoints).toLocaleString()} more basis points`
                : `Remove ${(totalBasisPoints - 10000).toLocaleString()} basis points`}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting} fullWidth>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            loading={isSubmitting}
            fullWidth
          >
            Save Holders
          </Button>
        </div>
      </div>
    </Modal>
  );
}
