'use client';

import { useMemo, useState } from 'react';
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
  ChevronDown,
  Calendar,
} from 'lucide-react';
import type { ShareHolder } from '@/types/program';
import type { TokenAccountInfo } from '@/hooks/useTokenAccounts';
import type { TokenDistributionRecord } from '@/hooks/useTokenDistributionRecords';

interface TokensSectionProps {
  storageName: string;
  storagePDA: PublicKey;
  admin: PublicKey;
  holders: ShareHolder[];
  enabled: boolean;
  isAdmin: boolean;
  onSuccess: () => void;
}

interface MintEntry {
  mint: PublicKey;
  tokenAccount: TokenAccountInfo | undefined;
  record: TokenDistributionRecord | undefined;
  decimals: number;
  balance: bigint;
}

function DistributeTokenModal({
  isOpen,
  onClose,
  entry,
  storageName,
  admin,
  holders,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  entry: MintEntry;
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

  const totalBalance = Number(entry.balance);
  const distribution = holders.map((h) => ({
    address: h.pubkey.toBase58(),
    percentage: formatBasisPoints(h.shareBasisPoints),
    amount: formatTokenAmount(
      BigInt(Math.floor((totalBalance * h.shareBasisPoints) / 10000)),
      entry.decimals
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
        tokenMint: entry.mint,
      });
      await executeTransaction(
        tx,
        () => { onSuccess(); onClose(); },
        [['token-accounts', admin.toBase58()], ['token-dist-records', admin.toBase58()]]
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Distribution failed');
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !isDistributing && onClose()} title="Confirm Token Distribution">
      <div className="space-y-5">
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Mint</p>
            <p className="font-mono text-xs text-gray-700 break-all">{entry.mint.toBase58()}</p>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-gray-200">
            <span className="font-semibold text-gray-900">Total to distribute</span>
            <span className="font-bold text-primary">{formatTokenAmount(entry.balance, entry.decimals)}</span>
          </div>
        </div>

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
          <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={16} />
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
          <Button variant="secondary" onClick={onClose} disabled={isDistributing} fullWidth>Cancel</Button>
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
  const { records, isLoading: isLoadingRecords, refresh: refreshRecords } = useTokenDistributionRecords(storagePDA);
  const [showAddToken, setShowAddToken] = useState(false);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [selectedMintKey, setSelectedMintKey] = useState<string | null>(null);
  const [copiedMint, setCopiedMint] = useState<string | null>(null);

  const isLoading = isLoadingBalances || isLoadingRecords;
  const canDistribute = enabled && holders.length > 0;

  const mintEntries = useMemo((): MintEntry[] => {
    const map = new Map<string, MintEntry>();
    for (const ta of tokenAccounts) {
      map.set(ta.mint.toBase58(), {
        mint: ta.mint,
        tokenAccount: ta,
        record: undefined,
        decimals: ta.decimals,
        balance: ta.balance,
      });
    }
    for (const record of records) {
      const key = record.mint.toBase58();
      if (map.has(key)) {
        map.get(key)!.record = record;
      } else {
        map.set(key, {
          mint: record.mint,
          tokenAccount: undefined,
          record,
          decimals: record.decimals,
          balance: BigInt(0),
        });
      }
    }
    return Array.from(map.values());
  }, [tokenAccounts, records]);

  // Resolve the currently viewed entry, falling back to first entry
  const effectiveMintKey = (selectedMintKey && mintEntries.some(e => e.mint.toBase58() === selectedMintKey))
    ? selectedMintKey
    : mintEntries[0]?.mint.toBase58() ?? null;
  const currentEntry = mintEntries.find(e => e.mint.toBase58() === effectiveMintKey);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMint(text);
    setTimeout(() => setCopiedMint(null), 2000);
  };

  const handleRefresh = () => { refreshBalances(); refreshRecords(); };
  const handleSuccess = () => { handleRefresh(); onSuccess(); };

  return (
    <>
      <div className="card-elevated p-6 sm:p-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Coins className="text-primary" size={20} />
            <h2 className="text-xl font-bold text-gray-900">SPL Tokens</h2>
            {mintEntries.length > 0 && (
              <span className="px-2 py-0.5 bg-primary-50 text-primary rounded-full text-xs font-semibold">
                {mintEntries.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
            {isAdmin && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAddToken(true); }}
              >
                <Plus size={13} /> Add Token
              </Button>
            )}
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : mintEntries.length === 0 ? (
          /* Empty state */
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Coins className="text-gray-400" size={22} />
            </div>
            <p className="text-gray-500 font-medium">No SPL tokens</p>
            {isAdmin && (
              <p className="text-sm text-gray-400 mt-1">
                Click <span className="font-semibold text-primary">Add Token</span> to set up a token account, then send tokens to the deposit address.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Token selector dropdown — only shown when 2+ tokens */}
            {mintEntries.length > 1 && (
              <div className="relative">
                <select
                  value={effectiveMintKey ?? ''}
                  onChange={(e) => setSelectedMintKey(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                >
                  {mintEntries.map((entry) => (
                    <option key={entry.mint.toBase58()} value={entry.mint.toBase58()}>
                      {formatAddress(entry.mint.toBase58(), 8)}
                      {'  ·  '}
                      {formatTokenAmount(entry.balance, entry.decimals)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>
            )}

            {/* Selected token card */}
            {currentEntry && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Token header row */}
                <div className="bg-gray-50/80 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                      <Coins className="text-primary" size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-semibold text-gray-900 truncate">
                          {formatAddress(currentEntry.mint.toBase58(), 6)}
                        </p>
                        <button
                          onClick={() => handleCopy(currentEntry.mint.toBase58())}
                          className="text-gray-400 hover:text-primary transition-colors shrink-0"
                        >
                          {copiedMint === currentEntry.mint.toBase58()
                            ? <Check size={12} className="text-green-500" />
                            : <Copy size={12} />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">{currentEntry.decimals} decimals</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-lg font-bold text-gray-900">
                      {formatTokenAmount(currentEntry.balance, currentEntry.decimals)}
                    </p>
                    <p className="text-xs text-gray-400">available</p>
                  </div>
                </div>

                {/* Distribution record stats */}
                {currentEntry.record && (
                  <div className="px-5 py-3 border-t border-gray-100 grid grid-cols-2 gap-4 bg-white">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="text-gray-400" size={14} />
                      <div>
                        <p className="text-xs text-gray-500">Total Distributed</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatTokenAmount(BigInt(currentEntry.record.totalDistributed), currentEntry.decimals)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="text-gray-400" size={14} />
                      <div>
                        <p className="text-xs text-gray-500">Last Distribution</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDate(currentEntry.record.lastDistributedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Distribute action */}
                <div className="px-5 py-3 border-t border-gray-100 bg-white">
                  <Button
                    size="sm"
                    fullWidth
                    disabled={!canDistribute || currentEntry.balance === BigInt(0)}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDistributeModal(true);
                    }}
                  >
                    <Send size={14} />
                    Distribute
                    {!enabled && ' (Storage Disabled)'}
                    {enabled && holders.length === 0 && ' (No Holders)'}
                  </Button>
                </div>
              </div>
            )}

            {/* Compact list of other tokens when multiple */}
            {mintEntries.length > 1 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-1 mb-2">
                  All tokens ({mintEntries.length})
                </p>
                {mintEntries.map((entry) => {
                  const key = entry.mint.toBase58();
                  const isActive = key === effectiveMintKey;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedMintKey(key)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-primary-50 border border-primary-200'
                          : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Coins size={13} className={isActive ? 'text-primary' : 'text-gray-400'} />
                        <span className={`font-mono ${isActive ? 'text-primary font-semibold' : 'text-gray-600'}`}>
                          {formatAddress(key, 6)}
                        </span>
                      </div>
                      <span className={`font-semibold ${isActive ? 'text-primary' : 'text-gray-700'}`}>
                        {formatTokenAmount(entry.balance, entry.decimals)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {isAdmin && (
        <AddTokenModal
          isOpen={showAddToken}
          onClose={() => setShowAddToken(false)}
          storageName={storageName}
          onSuccess={handleSuccess}
        />
      )}

      {showDistributeModal && currentEntry && (
        <DistributeTokenModal
          isOpen={showDistributeModal}
          onClose={() => setShowDistributeModal(false)}
          entry={currentEntry}
          storageName={storageName}
          admin={admin}
          holders={holders}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
