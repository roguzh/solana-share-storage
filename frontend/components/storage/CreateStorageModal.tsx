'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTransaction } from '@/hooks/useTransaction';
import { EnhancedRoyaltiesSDK } from '@/lib/solana/sdk';
import { DEFAULT_NETWORK, NETWORKS } from '@/config/networks';
import { validateStorageName } from '@/lib/utils/validation';
import { parseProgramError } from '@/lib/utils/errors';

interface CreateStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateStorageModal({ isOpen, onClose, onSuccess }: CreateStorageModalProps) {
  const { publicKey } = useWallet();
  const { executeTransaction, isLoading } = useTransaction();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!publicKey) return;

    // Validate name
    const validation = validateStorageName(name);
    if (!validation.isValid) {
      setError(validation.error!);
      return;
    }

    try {
      setError('');
      const sdk = new EnhancedRoyaltiesSDK(NETWORKS[DEFAULT_NETWORK].rpcEndpoint);

      const tx = await sdk.initShareStorageTransaction({
        storageName: name,
        initiator: publicKey,
      });

      await executeTransaction(
        tx,
        () => {
          onSuccess();
          setName('');
          onClose();
        },
        [['storages', publicKey.toBase58()]] // Revalidate storages list
      );
    } catch (err: any) {
      setError(parseProgramError(err));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Share Storage">
      <div className="space-y-4">
        <Input
          label="Storage Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., team-royalties"
          maxLength={32}
          error={error}
          helperText="1-32 characters. This will be used to identify your storage."
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> After creation, you&apos;ll need to configure holders
            and their share percentages before you can distribute funds.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            fullWidth
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            fullWidth
            loading={isLoading}
            disabled={!name || isLoading}
          >
            Create Storage
          </Button>
        </div>
      </div>
    </Modal>
  );
}
