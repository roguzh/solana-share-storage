'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useTokenAccounts } from '@/hooks/useTokenAccounts';
import { useTokenDistributionRecords } from '@/hooks/useTokenDistributionRecords';
import { useTransaction } from '@/hooks/useTransaction';
import { useEnhancedRoyaltiesSDK } from '@/hooks/useEnhancedRoyaltiesSDK';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AddTokenModal } from '@/components/storage/AddTokenModal';
import { formatTokenAmount, formatAddress, formatBasisPoints, formatDate } from '@/lib/utils/format';
import {
  Coins,
  Plus,
  Send,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import type { ShareHolder } from '@/types/program';
import type { TokenAccountInfo } from '@/hooks/useTokenAccounts';

interface TokensSectionProps {
  storageName: string;
  storagePDA: PublicKey;
  admin: PublicKey;
  holders: ShareHolder[];
  enabled: boolean;
  isAdmin: boolean;
  onSuccess: () => void;
}

function DistributeTokenModal({
  isOpen,
  onClose,
  token,
  storageName,
  admin,
  holders,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  token: TokenAccountInfo;
  storageName: string;
  admin: PublicKey;
  holders: ShareHolder[];
  onSuccess: () => void;
}) {
  const { publicKey } = useWallet();
  const sdk = useEnhancedRoyaltiesSDK();
  const { executeTransaction } = useTransaction();
  const [isDistributing, setIsDistributing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalBalance = Number(token.balance);
  const distribution = holders.map((h) => ({
    address: h.pubkey.toBase58(),
    percentage: formatBasisPoints(h.shareBasisPoints),
    amount: formatTokenAmount(
      BigInt(Math.floor((totalBalance * h.shareBasisPoints) / 10000)),
      token.decimals
    ),
  }));

  const handleDistribute = async () => {
    if (!publicKey || !sdk) return;

    setError(null);
    setIsDistributing(true);

    try {
      const tx = await sdk.distributeTokensTransaction({
        shareStorageName: storageName,
        admin: publicKey,
        tokenMint: token.mint,
      });

      await executeTransaction(
        tx,
        () => {
          onSuccess();
          onClose();
        },
        [['token-accounts', admin.toBase58()], ['token-dist-records', admin.toBase58()]]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Distribution failed';
      setError(msg);
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !isDistributing && onClose()} title="Confirm Token Distribution">
      <div className="space-y-5">
        {/* Token info */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Mint</p>
            <p className="font-mono text-xs text-gray-700 break-all">{token.mint.toBase58()}</p>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-gray-200">
            <span className="font-semibold text-gray-900">Total to distribute</span>
            <span className="font-bold text-primary">
              {formatTokenAmount(token.balance, token.decimals)}
            </span>
          </div>
        </div>

        {/* Per-holder breakdown */}
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Distribution Preview</p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {distribution.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <div>
                  <p className="font-mono text-xs text-gray-600">{formatAddress(d.address, 6)}</p>
                  <p className="text-xs text-gray-400">{d.percentage}</p>
                </div>
                <p className="font-semibold text-primary">{d.amount}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-blue-800">
            Holder token accounts will be created automatically if they don&apos;t exist yet.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isDistributing} fullWidth>
            Cancel
          </Button>
          <Button onClick={handleDistribute} loading={isDistributing} disabled={isDistributing} fullWidth>
            <Check size={16} /> Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function TokensSection({
  storageName,
  storagePDA,
  admin,
  holders,
  enabled,
  isAdmin,
  onSuccess,
}: TokensSectionProps) {
  const { tokenAccounts, isLoading: isLoadingBalances, refresh: refreshBalances } = useTokenAccounts(storagePDA);
  const { records, refresh: refreshRecords } = useTokenDistributionRecords(
    storagePDA,
    admin,
    storageName,
    tokenAccounts
  );
  const [showAddToken, setShowAddToken] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenAccountInfo | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const canDistribute = enabled && holders.length > 0;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleRefresh = () => {
    refreshBalances();
    refreshRecords();
  };

  const handleSuccess = () => {
    handleRefresh();
    onSuccess();
  };

  const getRecord = (mint: PublicKey) =>
    records.find((r) => r.mint.toBase58() === mint.toBase58());

  return (
    <>
      <div className="card-elevated p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Coins className="text-primary" size={22} />
            <h2 className="text-xl font-bold text-gray-900">SPL Tokens</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoadingBalances}
              className="text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={16} className={isLoadingBalances ? 'animate-spin' : ''} />
            </button>
            {isAdmin && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAddToken(true); }}
              >
                <Plus size={14} /> Add Token
              </Button>
            )}
          </div>
        </div>

        {isLoadingBalances ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : tokenAccounts.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Coins className="text-gray-400" size={22} />
            </div>
            <p className="text-gray-500 font-medium">No SPL tokens</p>
            {isAdmin && (
              <p className="text-sm text-gray-400 mt-1">
                Click <span className="font-semibold text-primary">Add Token</span> to set up a token account,
                then send tokens to the deposit address.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {tokenAccounts.map((token) => {
              const record = getRecord(token.mint);
              const mintStr = token.mint.toBase58();

              return (
                <div key={mintStr} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Token header */}
                  <div className="bg-gray-50/80 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Coins className="text-primary" size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-semibold text-gray-900 truncate">
                            {formatAddress(mintStr, 6)}
                          </p>
                          <button
                            onClick={() => handleCopy(mintStr)}
                            className="text-gray-400 hover:text-primary transition-colors flex-shrink-0"
                          >
                            {copiedAddress === mintStr ? (
                              <Check size={12} className="text-green-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-400">
                          {token.decimals} decimals
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-lg font-bold text-gray-900">
                        {formatTokenAmount(token.balance, token.decimals)}
                      </p>
                      <p className="text-xs text-gray-400">available</p>
                    </div>
                  </div>

                  {/* Distribution record */}
                  {record && (
                    <div className="px-5 py-3 border-t border-gray-100 grid grid-cols-2 gap-4 bg-white">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="text-gray-400" size={14} />
                        <div>
                          <p className="text-xs text-gray-500">Total Distributed</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatTokenAmount(BigInt(record.totalDistributed), token.decimals)}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Last Distribution</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDate(record.lastDistributedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Distribute action */}
                  <div className="px-5 py-3 border-t border-gray-100 bg-white">
                    <Button
                      size="sm"
                      fullWidth
                      disabled={!canDistribute || token.balance === BigInt(0)}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedToken(token);
                      }}
                    >
                      <Send size={14} />
                      Distribute
                      {!enabled && ' (Storage Disabled)'}
                      {enabled && holders.length === 0 && ' (No Holders)'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {isAdmin && (
        <AddTokenModal
          isOpen={showAddToken}
          onClose={() => setShowAddToken(false)}
          storageName={storageName}
          onSuccess={handleSuccess}
        />
      )}

      {selectedToken && (
        <DistributeTokenModal
          isOpen={!!selectedToken}
          onClose={() => setSelectedToken(null)}
          token={selectedToken}
          storageName={storageName}
          admin={admin}
          holders={holders}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
